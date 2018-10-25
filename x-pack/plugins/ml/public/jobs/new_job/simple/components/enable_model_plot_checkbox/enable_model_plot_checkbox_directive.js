/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { EnableModelPlotCheckbox } from './enable_model_plot_checkbox_view.js';
import { ml } from 'plugins/ml/services/ml_api_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlEnableModelPlotCheckbox', function () {
  return {
    restrict: 'AE',
    replace: false,
    scope: {
      formConfig: '=',
      ui: '=ui',
      getJobFromConfig: '='
    },
    link: function ($scope, $element) {
      const STATUS = {
        FAILED: -1,
        NOT_RUNNING: 0,
        RUNNING: 1,
        FINISHED: 2
      };
      console.log('function?', $scope.getJobFromConfig); // remove
      const errorHandler = (error) => {
        console.log('Cardinality could not be validated', error);
        $scope.ui.cardinalityValidator.status = STATUS.FAILED;
        $scope.ui.cardinalityValidator.message = 'Cardinality could not be validated';
      };

      const validateCardinality = function () {
        $scope.ui.cardinalityValidator.status = STATUS.RUNNING;
        $scope.ui.cardinalityValidator.message = '';

        // create temporary job since cardinality validation expects that format -> Note: Do I need to clear out tempJob somewhere?
        const tempJob = $scope.getJobFromConfig($scope.formConfig);

        ml.validateCardinality(tempJob)
          .then((response) => {
            console.log(response); // remove
            if (response.error) {
              errorHandler(response.message);
              return;
            }
            // Successful validation: [{ id: 'success_cardinality' }]
            const successfulValidation = (
              Array.isArray(response) &&
              (response.length === 1) &&
              (response[0].id === 'success_cardinality')
            );

            if (successfulValidation) {
              $scope.formConfig.enableModelPlot = true;
            } else {
              console.log('Validation not successful', response);
              // TODO: show are you sure message + response message if cardinality > 100
              // 0:{id:"cardinality_model_plot_high",modelPlotCardinality:11405},
              // 1:{id:"cardinality_partition_field",fieldName:"clientip"}
            }

            $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
          })
          .catch(errorHandler);
      };

      $scope.handleCheckboxChange = (isChecked) => {
        if (isChecked) {
          validateCardinality();
        } else {
          $scope.formConfig.enableModelPlot = false;
        }
      };

      // watch for these changes
      $scope.$watch('ui.formValid', updateCheckbox, true);
      $scope.$watch('ui.cardinalityValidator.status', updateCheckbox, true);

      function updateCheckbox() {
        const checkboxDisabled = (
          $scope.ui.cardinalityValidator.status === STATUS.RUNNING ||
          $scope.ui.formValid !== true
        );
        const validatorRunning = ($scope.ui.cardinalityValidator.status === STATUS.RUNNING);
        const checkboxText = (validatorRunning) ? 'Validating cardinality...' : 'Enable model plot';

        const props = {
          checkboxDisabled,
          checkboxText,
          onCheckboxChange: $scope.handleCheckboxChange,
        };

        ReactDOM.render(
          React.createElement(EnableModelPlotCheckbox, props),
          $element[0]
        );
      }

      updateCheckbox();
    }
  };
});
