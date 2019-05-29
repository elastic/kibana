/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import ReactDOM from 'react-dom';

import { BucketSpanEstimator } from './bucket_span_estimator_view';
import { EVENT_RATE_COUNT_FIELD } from 'plugins/ml/jobs/new_job/simple/components/constants/general';
import { ml } from 'plugins/ml/services/ml_api_service';

import { I18nContext } from 'ui/i18n';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlBucketSpanEstimator', function () {
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
    link: function ($scope, $element) {
      const STATUS = {
        FAILED: -1,
        NOT_RUNNING: 0,
        RUNNING: 1,
        FINISHED: 2
      };

      const errorHandler = (error) => {
        console.log('Bucket span could not be estimated', error);
        $scope.ui.bucketSpanEstimator.status = STATUS.FAILED;
        $scope.ui.bucketSpanEstimator.message = i18n.translate(
          'xpack.ml.newJob.simple.bucketSpanEstimator.bucketSpanCouldNotBeEstimatedMessage', {
            defaultMessage: 'Bucket span could not be estimated'
          });
        $scope.$applyAsync();
      };

      $scope.guessBucketSpan = function () {
        $scope.ui.bucketSpanEstimator.status = STATUS.RUNNING;
        $scope.ui.bucketSpanEstimator.message = '';
        $scope.$applyAsync();

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
          index: $scope.formConfig.indexPattern.title,
          query: $scope.formConfig.combinedQuery,
          splitField: $scope.formConfig.splitField && $scope.formConfig.splitField.name,
          timeField: $scope.formConfig.timeField
        };

        if ($scope.formConfig.fields === undefined) {
          // single metric config
          const fieldName = ($scope.formConfig.field === null) ? null : $scope.formConfig.field.name;
          data.fields.push(fieldName);
          data.aggTypes.push($scope.formConfig.agg.type.dslName);
        } else {
          // multi metric config
          Object.keys($scope.formConfig.fields).map((id) => {
            const field = $scope.formConfig.fields[id];
            const fieldName = (field.id === EVENT_RATE_COUNT_FIELD) ? null : field.name;
            data.fields.push(fieldName);
            data.aggTypes.push(field.agg.type.dslName);
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
            $scope.$applyAsync();
          })
          .catch(errorHandler);
      };

      // export the guessBucketSpan function so it can be called from outside this directive.
      // this is used when auto populating the settings from the URL.
      if ($scope.exportedFunctions !== undefined && typeof $scope.exportedFunctions === 'object') {
        $scope.exportedFunctions.guessBucketSpan = $scope.guessBucketSpan;
      }

      // watch for these changes
      $scope.$watch('formConfig.agg.type', updateButton, true);
      $scope.$watch('jobStateWrapper.jobState', updateButton, true);
      $scope.$watch('[ui.showJobInput,ui.formValid,ui.bucketSpanEstimator.status]', updateButton, true);

      function updateButton() {
        const buttonDisabled = (
          $scope.ui.showJobInput === false ||
          $scope.ui.formValid === false ||
          $scope.formConfig.agg.type === undefined ||
          $scope.jobStateWrapper.jobState === $scope.JOB_STATE.RUNNING ||
          $scope.jobStateWrapper.jobState === $scope.JOB_STATE.STOPPING ||
          $scope.jobStateWrapper.jobState === $scope.JOB_STATE.FINISHED ||
          $scope.ui.bucketSpanEstimator.status === STATUS.RUNNING
        );
        const estimatorRunning = ($scope.ui.bucketSpanEstimator.status === STATUS.RUNNING);
        const buttonText = (estimatorRunning)
          ? i18n.translate('xpack.ml.newJob.simple.bucketSpanEstimator.estimatingBucketSpanButtonLabel', {
            defaultMessage: 'Estimating bucket span'
          })
          : i18n.translate('xpack.ml.newJob.simple.bucketSpanEstimator.estimateBucketSpanButtonLabel', {
            defaultMessage: 'Estimate bucket span'
          });

        const props = {
          buttonDisabled,
          estimatorRunning,
          guessBucketSpan: $scope.guessBucketSpan,
          buttonText
        };

        ReactDOM.render(
          <I18nContext>
            {React.createElement(BucketSpanEstimator, props)}
          </I18nContext>,
          $element[0]
        );
      }

      updateButton();
    }
  };
});
