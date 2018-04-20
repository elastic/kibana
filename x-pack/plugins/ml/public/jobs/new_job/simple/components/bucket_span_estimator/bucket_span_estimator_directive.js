/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './bucket_span_estimator.html';
import { getQueryFromSavedSearch } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { EVENT_RATE_COUNT_FIELD } from 'plugins/ml/jobs/new_job/simple/components/constants/general';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlBucketSpanEstimator', function ($injector) {
  const ml = $injector.get('ml');

  return {
    restrict: 'AE',
    replace: false,
    scope: {
      bucketSpanFieldChange: '=',
      formConfig: '=',
      jobStateWrapper: '=',
      JOB_STATE: '=jobState',
      ui: '=ui',
      exportedFunctions: '='
    },
    template,
    link: function ($scope) {
      const STATUS = {
        FAILED: -1,
        NOT_RUNNING: 0,
        RUNNING: 1,
        FINISHED: 2
      };
      $scope.STATUS = STATUS;

      const errorHandler = (error) => {
        console.log('Bucket span could not be estimated', error);
        $scope.ui.bucketSpanEstimator.status = STATUS.FAILED;
        $scope.ui.bucketSpanEstimator.message = 'Bucket span could not be estimated';
      };

      $scope.guessBucketSpan = function () {
        $scope.ui.bucketSpanEstimator.status = STATUS.RUNNING;
        $scope.ui.bucketSpanEstimator.message = '';

        // we need to create a request object here because $scope.formConfig
        // includes objects with methods which might break the required
        // object structure when stringified for the server call
        const data = {
          aggTypes: [],
          duration: {
            start: $scope.formConfig.start,
            end: $scope.formConfig.end
          },
          fields: [],
          filters: $scope.formConfig.filters,
          index: $scope.formConfig.indexPattern.title,
          query: getQueryFromSavedSearch($scope.formConfig),
          splitField: $scope.formConfig.splitField && $scope.formConfig.splitField.name,
          timeField: $scope.formConfig.timeField
        };

        if ($scope.formConfig.fields === undefined) {
          // single metric config
          const fieldName = ($scope.formConfig.field === null) ? null : $scope.formConfig.field.name;
          data.fields.push(fieldName);
          data.aggTypes.push($scope.formConfig.agg.type.name);
        } else {
          // multi metric config
          Object.keys($scope.formConfig.fields).map((id) => {
            const field = $scope.formConfig.fields[id];
            const fieldName = (field.id === EVENT_RATE_COUNT_FIELD) ? null : field.name;
            data.fields.push(fieldName);
            data.aggTypes.push(field.agg.type.name);
          });
        }

        ml.estimateBucketSpan(data)
          .then((interval) => {
            if (interval.error) {
              errorHandler(interval.message);
              return;
            }

            const notify = ($scope.formConfig.bucketSpan !== interval.name);
            $scope.formConfig.bucketSpan = interval.name;
            $scope.ui.bucketSpanEstimator.status = STATUS.FINISHED;
            if (notify && typeof $scope.bucketSpanFieldChange === 'function') {
              $scope.bucketSpanFieldChange();
            }
          })
          .catch(errorHandler);
      };

      // export the guessBucketSpan function so it can be called from outside this directive.
      // this is used when auto populating the settings from the URL.
      if ($scope.exportedFunctions !== undefined && typeof $scope.exportedFunctions === 'object') {
        $scope.exportedFunctions.guessBucketSpan = $scope.guessBucketSpan;
      }

    }
  };
});
