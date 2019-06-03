/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { postSaveService } from './post_save_service';
import { i18n } from '@kbn/i18n';
import { mlCreateWatchService } from 'plugins/ml/jobs/new_job/simple/components/watcher/create_watch_service';
import { xpackFeatureProvider } from 'plugins/ml/license/check_license';
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
      const xpackFeature = Private(xpackFeatureProvider);

      $scope.watcherEnabled = xpackFeature.isAvailable('watcher');
      $scope.status = postSaveService.status;
      $scope.STATUS = postSaveService.STATUS;

      mlCreateWatchService.reset();

      mlCreateWatchService.config.includeInfluencers = $scope.includeInfluencers;
      $scope.runInRealtime = false;
      $scope.createWatch = false;
      $scope.embedded = true;

      $scope.clickRunInRealtime = function () {
        $scope.createWatch = (!$scope.runInRealtime) ? false : $scope.createWatch;
      };

      $scope.apply = function () {
        postSaveService.apply($scope.jobId, $scope.runInRealtime, $scope.createWatch, i18n)
          .catch(() => {})
          .then(() => {
            $scope.$applyAsync();
          });
      };
    }
  };
});
