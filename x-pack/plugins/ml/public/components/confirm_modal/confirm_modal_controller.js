/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlConfirmModal', function ($scope, $modalInstance, params, i18n) {

  $scope.okFunc = params.ok;
  $scope.cancelFunc = params.cancel;

  $scope.message = params.message || '';
  $scope.title = params.title || '';

  $scope.okLabel = params.okLabel || i18n('xpack.ml.confirmModal.okButtonLabel', {
    defaultMessage: 'OK',
  });

  $scope.cancelLabel = params.cancelLabel || i18n('xpack.ml.confirmModal.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  });

  $scope.hideCancel = params.hideCancel || false;

  $scope.ok = function () {
    $scope.okFunc();
    $modalInstance.close();
  };

  $scope.cancel = function () {
    $scope.cancelFunc();
    $modalInstance.close();
  };

});
