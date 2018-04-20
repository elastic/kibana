/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { parseInterval } from 'ui/utils/parse_interval';

import template from './create_watch.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlCreateWatch', function (es, ml, mlCreateWatchService) {
  return {
    restrict: 'AE',
    replace: false,
    scope: {
      jobId: '=',
      bucketSpan: '=',
      embedded: '='
    },
    template,
    link: function ($scope) {

      $scope.config = mlCreateWatchService.config;
      $scope.status = mlCreateWatchService.status;
      $scope.STATUS = mlCreateWatchService.STATUS;

      $scope.ui = {
        thresholdOptions: [
          { display: 'critical', val: 75 },
          { display: 'major', val: 50 },
          { display: 'minor', val: 25 },
          { display: 'warning', val: 0 }
        ],
        setThreshold: (t) => {
          $scope.config.threshold = t;
        },
        emailEnabled: false,
        embedded: $scope.embedded,
        watchAlreadyExists: false
      };

      // make the interval 2 times the bucket span
      if ($scope.bucketSpan) {
        const interval = parseInterval($scope.bucketSpan);
        let bs = interval.asMinutes() * 2;
        if (bs < 1) {
          bs = 1;
        }
        $scope.config.interval = `${bs}m`;
      }

      // load elasticsearch settings to see if email has been configured
      ml.getNotificationSettings().then((resp) => {
        if (_.has(resp, 'defaults.xpack.notification.email')) {
          $scope.ui.emailEnabled = true;
        }
      });

      // check to see whether a watch for this job has already been created.
      // display a warning if it has.
      mlCreateWatchService.loadWatch($scope.jobId)
        .then(() => {
          $scope.ui.watchAlreadyExists = true;
        })
        .catch(() => {
          $scope.ui.watchAlreadyExists = false;
        });
    }
  };
});
