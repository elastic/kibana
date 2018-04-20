/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlCreateWatchModal', function ($scope, $modalInstance, params, mlMessageBarService, mlCreateWatchService) {
  const msgs = mlMessageBarService; // set a reference to the message bar service
  msgs.clear();

  $scope.jobId = params.job.job_id;
  $scope.bucketSpan = params.job.analysis_config.bucket_span;

  $scope.watcherEnabled = mlCreateWatchService.isWatcherEnabled();
  $scope.status = mlCreateWatchService.status;
  $scope.STATUS = mlCreateWatchService.STATUS;

  mlCreateWatchService.reset();
  mlCreateWatchService.config.includeInfluencers = params.job.analysis_config.influencers.length ? true : false;

  $scope.apply = function () {
    mlCreateWatchService.createNewWatch($scope.jobId)
      .catch((resp) => {
        msgs.clear();
        msgs.error('Watch could not be saved');
        if (typeof resp === 'string') {
          msgs.error(resp);
        }
        $scope.status.watch = null;
      });
  };

  $scope.close = function () {
    $modalInstance.close();
  };
});
