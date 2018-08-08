/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlDeleteJobModal', function ($scope, $modalInstance, params) {

  $scope.ui = {
    stage: 0,
    status: params.status,
    jobId: params.jobId,
    isDatafeed: params.isDatafeed
  };

  $scope.delete = function () {
    $scope.ui.stage = 1;
    params.doDelete();
  };

  // once the job is saved and optional upload is complete.
  // close modal and return to jobs list
  $scope.close = function () {
    $modalInstance.close();
  };

});
