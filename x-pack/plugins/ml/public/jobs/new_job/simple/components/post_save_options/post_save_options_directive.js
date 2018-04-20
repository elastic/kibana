/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './post_save_options.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlPostSaveOptions', function (mlPostSaveService, mlCreateWatchService) {
  return {
    restrict: 'AE',
    replace: false,
    scope: {
      jobId: '=',
      bucketSpan: '=',
      includeInfluencers: '=',
    },
    template,
    link: function ($scope) {

      $scope.watcherEnabled = mlCreateWatchService.isWatcherEnabled();
      $scope.status = mlPostSaveService.status;
      $scope.STATUS = mlPostSaveService.STATUS;

      mlCreateWatchService.reset();

      mlCreateWatchService.config.includeInfluencers = $scope.includeInfluencers;
      $scope.runInRealtime = false;
      $scope.createWatch = false;
      $scope.embedded = true;

      $scope.clickRunInRealtime = function () {
        $scope.createWatch = (!$scope.runInRealtime) ? false : $scope.createWatch;
      };

      $scope.apply = function () {
        mlPostSaveService.apply($scope.jobId, $scope.runInRealtime, $scope.createWatch);
      };
    }
  };
}).service('mlPostSaveService', function (mlJobService, mlMessageBarService, $q, mlCreateWatchService) {
  const msgs = mlMessageBarService;
  this.STATUS = {
    SAVE_FAILED: -1,
    SAVING: 0,
    SAVED: 1,
  };

  this.status = {
    realtimeJob: null,
    watch: null
  };
  mlCreateWatchService.status = this.status;

  this.externalCreateWatch;
  this.startRealtimeJob = function (jobId) {
    const deferred = $q.defer();
    this.status.realtimeJob = this.STATUS.SAVING;

    const datafeedId = mlJobService.getDatafeedId(jobId);

    mlJobService.openJob(jobId)
      .finally(() => {
        mlJobService.startDatafeed(datafeedId, jobId, 0, undefined)
          .then(() => {
            this.status.realtimeJob = this.STATUS.SAVED;
            deferred.resolve();
          }).catch((resp) => {
            msgs.error('Could not start datafeed: ', resp);
            this.status.realtimeJob = this.STATUS.SAVE_FAILED;
            deferred.reject();
          });
      });

    return deferred.promise;
  };

  this.apply = function (jobId, runInRealtime, createWatch) {
    if (runInRealtime) {
      this.startRealtimeJob(jobId)
        .then(() => {
          if (createWatch) {
            mlCreateWatchService.createNewWatch(jobId);
          }
        });
    }
  };
});
