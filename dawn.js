//TODOTMH: change theme color

var $app = {
    // linkCallBackMap: {},
    MAIN: "#mainContent",
    $validator: undefined,
    model: {},
    currentCtlr: $app,
    currentCntx: null,
    initTypeAhead: function (ele, url, dataLink, display) {
        $(ele).each(function () {
            $(this).typeahead({
                source: function (query, process) {
                    return $.get(url, { search_criteria: query }, function (resp) {
                        return process(resp);
                    });
                },
                minLength: 1,
                displayText: function (item) {
                    return item[display] || item.name;
                },
                afterSelect: function (item) {
                    var dataLinkValue = $(this.$element[0]).data(dataLink);
                    console.log("dataLinkValue:" + dataLinkValue);
                    $('[name="' + $(this.$element[0]).data(dataLink) + '"]').prop('value', item.id);
                }
            });
        });
    },
    attachCtlr: {
        listenerId: '',
        onModalInit: function (e) {
            var clicker = e.currentTarget; // e.target is <i> tag material
            // when you don't need to generalize , don't 
            var $sthForm = $("#attachForm", '#attachModal');
            var $targetModal = $('#attachModal');
            $("#attachMasterId", '#attachForm').val($("#masterId").val());
            $sthForm.prop('action', $(clicker).data("sth-attach-action"));
            this.listenerId = $(clicker).data("sth-listener");
            initAllModal("#attachModal", true);
        },
        afterFormSubmit: function (resp) {
            serverSideNotfiy(resp);
            $("#attachModal").modal('hide');
            $("span.fileinput-filename", "#attachModal").text("");
            $("#" + this.listenerId).trigger("success.attach.sth");
        },
        delete: function (e) {
            var clicker = e.currentTarget;
            callAjax(clicker.href, "GET", function (resp) {
                serverSideNotfiy(resp);
                $(clicker).closest('table').trigger("success.attach.sth");
            }, function (resp) {
                serverSideNotfiy(resp.responseJSON, $(clicker));
            });
        },
    },
    calculatePaginate: function (list) {
        var firstPage = list.start === 0;
        var lastPage = ((list.start + 1) * list.length === list.recordsFiltered || (list.data.length < list.length)) ? true : false;
        return {
            previous: firstPage,
            next: lastPage,
        }
    },
    formValidation: function (target) {
        console.log("validate-target:" + target[0].id);
        var validationRules = $app.validationRules[$(target).data("validator-rule")];
        if (validationRules) {
            this.$validator = $(target).validate({
                // debug: true,
                rules: validationRules,
                errorPlacement: function (error, element) {
                    $(element).parent('div').addClass('has-error');
                }
            });
            var $valid = $(target).valid();

            if (!$valid) {
                this.$validator.focusInvalid();
                return false;
            } else {
                return true;
            }
        }
    },
};

$app.submitAjaxForm = function (e) {
    logEventInfo(e);
    console.log("ajax_form_submit:how many time I show up");

    var valid = this.formValidation($(e.target));
    if (!valid) {
        return false;
    }

    // $datepicker.format('YYYY-MM-DD');
    $.each($(".datepicker", '#' + $(e.target).attr("id")), function (index, ele) {
        $(ele).val() && $(ele).val(moment($(ele).val(), "DD/MM/YYYY").format("YYYY-MM-DD"));
        console.log($(ele).prop('name') + "(length):" + $(ele).val().length);
        console.log($(ele).prop('name') + ":" + $(ele).val());
    });
    var $form = $(e.target);
    var term = $form.serializeArray();

    /* get some values from elements on the page: */
    console.log("after date conversion");
    $.each($(".datepicker", '#' + $(e.target).attr("id")), function (index, ele) {
        $(ele).val() && $(ele).val(moment($(ele).val(), "YYYY-MM-DD").format("DD/MM/YYYY"));
        console.log($(ele).val());
    });

    var objectifiedForm = objectifyForm(term);
    var url = $form.attr('action');

    if ($app.currentCtlr.lastminute) {
        $app.currentCtlr.lastminute({ objectifiedForm: objectifiedForm, url: url, target: $form });
    }
    /* Send the data using post */
    var posting = $.ajax({
        url: url,
        type: 'POST',
        data: objectifiedForm /*formData*//*objectifyForm(term)*/,
        // contentType: false,
        // processData: false,
        success: function (resp) {
            var method = $(e.target).data('sth-form-submit');
            var ctlrName = $(e.target).data('sth-ctlr')
            var ctlr = null;
            if (ctlrName) {
                ctlr = $app[ctlrName];
            } else {
                ctlr = $app.currentCtlr;
            }
            if (method) {
                ctlr[method].call(ctlr, resp, e.target);
            } else {
                ctlr.afterFormSubmit && ctlr.afterFormSubmit(resp, e.target);
            }
        },
        error: function (resp) {
            serverSideNotfiy(resp.responseJSON, $(e.target));
        },
    }).done(function () {
        console.log("ajax done:submitAjaxForm");
    }).fail(function () {
        // need more study
    }).always(function () {
    });
}


function callServerSide(ctlr, normalizeObj) {
    try {


        $app.currentCtlr = ctlr;
        if (ctlr.type == "noTemplate") {
            callAjax(ctlr.viewLink, "GET", function (view, status) {
                $($app.MAIN).empty();
                $($app.MAIN).prepend(view);
                $app.currentCntx = "#" + $($app.MAIN).children(":first-child").attr('id');
                ctlr.cb($app.currentCntx);
            }, function (resp) {
                serverSideNotfiy(resp && resp.responseJSON);
            });
        } else if (ctlr.type == "option") {
            var tableColumns = [{
                title: "", data: "id", "orderable": false, "searchable": false, "render": function (data, type, row, meta) {
                    return '<a  class="tableEdit optionBtn"   data-target="#optionModal" data-sth-child-id="' + data + '"><i class="material-icons">edit</i></a>'
                }
            },
            { title: "Name", data: "name" }];
            callAjax("/common/simpleTable.html", "GET", function (view, status) {
                $($app.MAIN).empty();
                $($app.MAIN).prepend(view);

                $("[name='tname']", "#optionModal").val(ctlr.tableName);
                $("#optionTitle", "#optionModal").data('sth-title', ctlr.tableTitle);
                var url = "/getDt?tname=" + ctlr.tableName;

                if (ctlr.moreColumns) {
                    $.each(ctlr.moreColumns.split("|"), function (index, value) {
                        if (value != "") {
                            var splits = value.split("!");
                            $('#' + splits[0], "#optionModal").removeClass('hide');
                            $("[name='" + splits[0] + "']", "#optionModal").prop('disabled', false);
                            tableColumns.push({ "title": splits[1], "data": splits[0] })
                        }
                    });
                }
                $('#optionTable').DataTable({
                    // "lengthMenu": [[ 10, 25, 50, -1], [ 10, 25, 50, "All"]],
                    responsive: true,
                    language: {
                        search: "_INPUT_",
                        searchPlaceholder: "Search records",
                    },
                    ajax: {
                        url: url,
                    },
                    "columns": tableColumns
                });

                // $('.card .material-datatables label').addClass('form-group');
                $('#viewTitle', "#optionView").empty().prepend(ctlr.tableTitle);
                $app.currentCntx = "#" + $($app.MAIN).children(":first-child").attr('id');
            });

        } else if (ctlr.type == "withObj") {
            withObj(ctlr, normalizeObj);
        } else if (ctlr.type == "createRead") {
            if (normalizeObj) { // presence of normalizeObj means READ
                withObj(ctlr, normalizeObj);
            } else {
                callAjax(ctlr.viewLink, "GET", function (view, status) {
                    theTemplate = Handlebars.compile(view + "");
                    var readyHtml = theTemplate({});
                    $($app.MAIN).empty();
                    $($app.MAIN).prepend(readyHtml);
                    $app.currentCntx = "#" + $($app.MAIN).children(":first-child").attr('id');
                    try {
                        ctlr.cb($app.currentCntx);
                    } catch (err) {
                        console.log(err);
                    }
                }, function (resp) {
                    serverSideNotfiy(resp);
                });
            }

        }
    } catch (err) {
        console.log(err);
    }
}

function withObj(ctlr, normalizeObj) {
    $.when($.ajax(ctlr.viewLink, {
        type: "GET",
        contentType: "text/html"
    }), $.ajax(S(ctlr.modelLink).template(normalizeObj).s, {
        dataType: "json"
    })).then(function (viewResp, modelResp) {
        $app.model = modelResp[0].data;
        console.log(new Date() + " ;before template compile ");
        var theTemplate = Handlebars.compile(viewResp[0] + "");
        console.log(new Date() + " ;after template compile ");
        console.log(new Date() + " ;before readyHtml ");
        var readyHtml = theTemplate(modelResp[0].data);
        console.log(new Date() + " ;after readyHtml ");
        // console.log(readyHtml);
        $($app.MAIN).empty();
        $($app.MAIN).prepend(readyHtml);
        ctlr.cb("#" + $($app.MAIN).children(":first-child").attr('id'));
    });
}

$(document).ready(function () {
    S.TMPL_OPEN = '{';
    S.TMPL_CLOSE = '}';
    crossroads.normalizeFn = crossroads.NORM_AS_OBJECT;
    $.LoadingOverlaySetup({
        image: "/assets/img/ajax-loader.gif"
    });

    $.ajaxSetup({
        // error: function (xhr) {
        //     serverSideNotfiy(xhr);
        //     alert('Request Status: ' + xhr.status + ' Status Text: ' + xhr.statusText + ' ' + xhr.responseText);
        // }
    });

    $(document).ajaxStart(function () {
        $.LoadingOverlay("show");
    });
    $(document).ajaxStop(function () {
        $.LoadingOverlay("hide");
    });
    $.mockjax({
        // url: '/pim/editEmp/ed/jobHeld',
        // url: '/pim/editEmp/fam/selFam/2',
        // url: '/pim/editEmp/pd/addFile',
        // url: 'selDt/1',
        url: '/test',
        responseTime: 1000,
        contentType: 'application/json',
        responseText: {
            status: 200, message: "query succeed", data: [{}]
        },
    });

    // set Defaults for dataTable
    $.fn.dataTable.ext.errMode = "none";
    $.extend($.fn.dataTable.defaults, {
        "processing": true,
        "serverSide": true,
        "filter": false,
        // "xhr": function (e, settings, json, xhr) {
        //     var status  = json.status || 500;
        //     if (success !== 200) {
        //         var message = json.message || "Error Occured!";
        //         $(this).trigger("error.dt",e,settings, json.status,message)
        //     }
        // },
        // "error": function (e, settings, techNote, message) {
        //     console.log('An error has been reported by DataTables: ', message);
        // }
    });

    //------------------------------- ROUTE -------------------------------------------
    $app.routes();
    //setup hasher

    hasher.initialized.add(parseHash); // parse initial hash
    hasher.changed.add(parseHash); //parse hash changes
    hasher.init(); //start listening for history change



    $("#attachModal").on("change.bs.fileinput", function (e) {
        if (e.target !== e.currentTarget) {
            var file = null;
            file = $("[name='file_attach']", e.target).get(0).files[0];
            $(" #attachModal [name='file_size']").val(file.size);
            $(" #attachModal [name='file_type']").val(file.type);
            $("#attachModal [name='file_original_name']").val(file.name);
            if (file) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $(" #attachModal [name='file_content']").val(reader.result);
                }
                reader.readAsDataURL(file);
            }
        }
    });

    $("#attachModal").on("submit", function (e) {
        e.preventDefault();
        $app.submitAjaxForm(e);
    });

    $($app.MAIN).on("submit", "form.ajax_form_submit", function (e) {
        /* stop form from submitting normally */
        e.preventDefault();
        $app.submitAjaxForm(e);
    });

    // $($app.MAIN).on('shown.bs.tab', function (e) {
    //      if (e.target !== e.currentTarget) {

    //      }
    // });


    //TODO: tmh> strict mode
    var strict = (function () { return !this; }()); console.log("strict:" + strict);
});

function onXhrDt(e, settings, json, xhr) {
    var json = json || xhr.responseText;
    var status = json.status || 555;
    console.log(status);
    if (status !== 200 && !json.draw) {
        //ERASE: unfinished server side
        json.data = [];
        json.length = 0;
        serverSideNotfiy(json);
        return false;
    } else {
        return true;
    }
}
function onErrorDt(e, settings, techNote, message) {
    var resp = { status: 500, message: message };
    serverSideNotfiy(resp);
}

/**
 * 
 * @param {string} cntx DOM context 
 * @param {boolean} add whether adding new or editing existing record 
 */
function initAllModal(add, cntx, data) {
    for (var p in data) {
        // TMHTODO:  check below code apply  to option select
        $('[name="' + p + '"]', $(cntx)).val(data[p]);
    }
    if (add) {
        $("input:not(.primary)", cntx).val("");
        $("textarea", cntx).val("");
        $("select", cntx).val("");
    }
}

//@deprecated serverSideNotfiy replace this
function showAlert(data, timerVal) {
    swal({
        text: data.message,
        timer: timerVal || 2000,
        confirmButtonClass: 'btn btn-success',
    }).then(
        function () { },
        // handling the promise rejection
        function (dismiss) {
            if (dismiss === 'timer') {
            }
        })
}

function serverSideNotfiy(resp, ele) {
    if (resp.status === 200) {
        resp.type = "success";
        resp.icon = '<i class="material-icons" data-notify="icon" >check</i>';
    } else {
        resp.type = "danger";
        resp.icon = '<i class="material-icons" data-notify="icon" >error</i>';
    }
    showNotification(resp, ele, 'top', 'left');
}

function showNotification(resp, ele, from, align) {
    $.notify({
        icon: resp.icon,
        message: resp.message,
        target: "_top",
    }, {
            type: resp.type,
            // timer: 200,
            delay: 3000,
            placement: {
                from: from,
                align: align
            },
            // element: ele || $($app.MAIN),
            template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
            '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
            '<span data-notify="icon"></span> ' +
            '<span data-notify="title">{1}</span> ' +
            '<span data-notify="message">{2}</span>' +
            '</div>'
        });
}



function initAll(cntx) {
    //    $('.datetimepicker',cntx).datetimepicker({
    //             icons: {
    //                 time: "fa fa-clock-o",
    //                 date: "fa fa-calendar",
    //                 up: "fa fa-chevron-up",
    //                 down: "fa fa-chevron-down",
    //                 previous: 'fa fa-chevron-left',
    //                 next: 'fa fa-chevron-right',
    //                 today: 'fa fa-screenshot',
    //                 clear: 'fa fa-trash',
    //                 close: 'fa fa-remove',
    //                 inline: true
    //             }
    //          });

    $datepicker = $('.datepicker', cntx).datetimepicker({
        format: 'DD/MM/YYYY',
        icons: {
            time: "fa fa-clock-o",
            date: "fa fa-calendar",
            up: "fa fa-chevron-up",
            down: "fa fa-chevron-down",
            previous: 'fa fa-chevron-left',
            next: 'fa fa-chevron-right',
            today: 'fa fa-screenshot',
            clear: 'fa fa-trash',
            close: 'fa fa-remove',
            inline: true
        }
    });

    $('.timepicker', cntx).datetimepicker({
        //          format: 'H:mm',    // use this format if you want the 24hours timepicker
        format: 'h:mm A',    //use this format if you want the 12hours timpiecker with AM/PM toggle
        icons: {
            time: "fa fa-clock-o",
            date: "fa fa-calendar",
            up: "fa fa-chevron-up",
            down: "fa fa-chevron-down",
            previous: 'fa fa-chevron-left',
            next: 'fa fa-chevron-right',
            today: 'fa fa-screenshot',
            clear: 'fa fa-trash',
            close: 'fa fa-remove',
            inline: true

        }
    });
}

function showConfirm(title, message, proceedText, cancelText, proceedCB, cancelCB, executeCntx) {
    executeCntx = executeCntx || this;
    swal({
        title: title,
        text: message,
        type: 'question',
        // target: '#ed',
        showCancelButton: true,
        confirmButtonText: proceedText,
        confirmButtonClass: 'btn btn-success',
        cancelButtonText: cancelText,
        cancelButtonClass: 'btn btn-success',
        buttonsStyling: false,
    }).then(function () {
        proceedCB.apply(executeCntx);
        swal.close();
    }, function (dismiss) {
        if (dismiss === 'cancel') {
            cancelCB && cancelCB.apply(executeCntx);
        }
        swal.close();
    });
}

function populateDropDownList(data, eleName, cntx) {
    $.each(data, function (index, value) {
        $('<option value="' + value.id + '">' + value.name + '</option>').appendTo($("select[name='" + eleName + "']", cntx || $app.MAIN));
    });
}

function callAjax(url, type, successCB, errorCB) {
    $.ajax({
        url: url,
        type: type,
        success: successCB,
        error: errorCB,
    }).done(function () {
    }).fail(function (resp) {
        var resp = (resp && resp.responseJSON) || { status: 500, message: "ajax fail" };
        serverSideNotfiy(resp);
    }).always(function () {
    });
}

//introspect
function executeFunctionByName(functionName, executeCntx /*, args */) {
    var args = [].slice.call(arguments).splice(2);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        executeCntx = executeCntx[namespaces[i]];
    }
    return executeCntx[func].apply(executeCntx, args);
}

function getNS(s, c) {
    var n = s.split(".");
    for (var i = 0; i < n.length; i++) {
        c = c[n[i]];
        if (!c)
            return undefined;
    }
    return c;
}

function objectifyForm(formArray) {//serialize data function
    var returnArray = {};
    for (var i = 0; i < formArray.length; i++) {
        returnArray[formArray[i]['name']] = formArray[i]['value'];
    }
    return returnArray;
}

function reloadDataTable(target) {
    $(target).DataTable({
        retrieve: true,
    }).draw(true);

}

// function reloadCurrentHash(){
//     callServerSide()
// }

function parseHash(newHash, oldHash) {
    $app.currentCtlr&&$app.currentCtlr.destroy&&$app.currentCtlr.destroy($app.currentCntx);
    crossroads.parse(newHash);
}

//jQuerySelector
//'[attr-name="attr-value"]'