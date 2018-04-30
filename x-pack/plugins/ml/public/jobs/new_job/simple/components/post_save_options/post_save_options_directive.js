/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { PostSaveServiceProvider } from './post_save_service';
import { CreateWatchServiceProvider } from 'plugins/ml/jobs/new_job/simple/components/watcher/create_watch_service';
import template from './post_save_options.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlPostSaveOptions', function (Private) {
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

      const postSaveService = Private(PostSaveServiceProvider);
      const createWatchService = Private(CreateWatchServiceProvider);

      $scope.watcherEnabled = createWatchService.isWatcherEnabled();
      $scope.status = postSaveService.status;
      $scope.STATUS = postSaveService.STATUS;

      createWatchService.reset();

      createWatchService.config.includeInfluencers = $scope.includeInfluencers;
      $scope.runInRealtime = false;
      $scope.createWatch = false;
      $scope.embedded = true;

      $scope.clickRunInRealtime = function () {
        $scope.createWatch = (!$scope.runInRealtime) ? false : $scope.createWatch;
      };

      $scope.apply = function () {
        postSaveService.apply($scope.jobId, $scope.runInRealtime, $scope.createWatch);
      };
    }
  };
});
