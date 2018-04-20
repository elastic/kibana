/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// service for displaying a modal confirmation dialog with OK and Cancel buttons.

import template from './confirm_modal.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlConfirmModalService', function ($modal, $q) {

  this.open = function (options) {
    const deferred = $q.defer();
    $modal.open({
      template,
      controller: 'MlConfirmModal',
      backdrop: 'static',
      keyboard: false,
      size: (options.size === undefined) ? 'sm' : options.size,
      resolve: {
        params: function () {
          return {
            message: options.message,
            title: options.title,
            okLabel: options.okLabel,
            cancelLabel: options.cancelLabel,
            hideCancel: options.hideCancel,
            ok: deferred.resolve,
            cancel: deferred.reject,
          };
        }
      }
    });
    return deferred.promise;
  };
});

