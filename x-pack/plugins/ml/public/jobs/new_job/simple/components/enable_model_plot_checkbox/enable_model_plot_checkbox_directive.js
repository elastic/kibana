/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { EnableModelPlotCheckbox } from './enable_model_plot_checkbox_view.js';
import { ml } from '../../../../../services/ml_api_service';

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
        FINISHED: 2,
        WARNING: 3,
      };

      function errorHandler(error) {
        console.log('Cardinality could not be validated', error);
        $scope.ui.cardinalityValidator.status = STATUS.FAILED;
        $scope.ui.cardinalityValidator.message = 'Cardinality could not be validated';
      }

      // Only model plot cardinality relevant
      // format:[{id:"cardinality_model_plot_high",modelPlotCardinality:11405}, {id:"cardinality_partition_field",fieldName:"clientip"}]
      function checkCardinalitySuccess(data) {
        const response = {
          success: true,
        };
        // There were no fields to run cardinality on.
        if (Array.isArray(data) && data.length === 0) {
          return response;
        }

        for (let i = 0; i < data.length; i++) {
          if (data[i].id === 'success_cardinality') {
            break;
          }

          if (data[i].id === 'cardinality_model_plot_high') {
            response.success = false;
            response.highCardinality = data[i].modelPlotCardinality;
            break;
          }
        }

        return response;
      }

      function validateCardinality() {
        $scope.ui.cardinalityValidator.status = STATUS.RUNNING;
        $scope.ui.cardinalityValidator.message = '';

        // create temporary job since cardinality validation expects that format
        const tempJob = $scope.getJobFromConfig($scope.formConfig);

        ml.validateCardinality(tempJob)
          .then((response) => {
            const validationResult = checkCardinalitySuccess(response);

            if (validationResult.success === true) {
              $scope.formConfig.enableModelPlot = true;
              $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
            } else {
              $scope.ui.cardinalityValidator.message = `Creating model plots is resource intensive and not recommended
                where cardinality of the selected fields is greater than 100. Estimated cardinality
                for this job is ${validationResult.highCardinality}.
                If you enable model plot with this configuration we recommend you use a dedicated results index.`;

              $scope.ui.cardinalityValidator.status = STATUS.WARNING;
              // Go ahead and check the dedicated index box for them
              $scope.formConfig.useDedicatedIndex = true;
              // show the advanced section so the warning message is visible since validation failed
              $scope.ui.showAdvanced = true;
            }
          })
          .catch(errorHandler);
      }

      // Re-validate cardinality for updated fields/splitField
      // when enable model plot is checked and form valid
      function revalidateCardinalityOnFieldChange() {
        if ($scope.formConfig.enableModelPlot === true && $scope.ui.formValid === true) {
          validateCardinality();
        }
      }

      $scope.handleCheckboxChange = (isChecked) => {
        if (isChecked) {
          $scope.formConfig.enableModelPlot = true;
          validateCardinality();
        } else {
          $scope.formConfig.enableModelPlot = false;
          $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
          $scope.ui.cardinalityValidator.message = '';
        }
      };

      // Update checkbox on these changes
      $scope.$watch('ui.formValid', updateCheckbox, true);
      $scope.$watch('ui.cardinalityValidator.status', updateCheckbox, true);
      // MultiMetric: Fire off cardinality validatation when fields and/or split by field is updated
      $scope.$watch('formConfig.fields', revalidateCardinalityOnFieldChange, true);
      $scope.$watch('formConfig.splitField', revalidateCardinalityOnFieldChange, true);
      // Population: Fire off cardinality validatation when overField is updated
      $scope.$watch('formConfig.overField', revalidateCardinalityOnFieldChange, true);

      function updateCheckbox() {
        // disable if (check is running && checkbox checked) or (form is invalid && checkbox unchecked)
        const checkboxDisabled = (
          ($scope.ui.cardinalityValidator.status === STATUS.RUNNING &&
          $scope.formConfig.enableModelPlot === true) ||
          ($scope.ui.formValid !== true &&
          $scope.formConfig.enableModelPlot === false)
        );
        const validatorRunning = ($scope.ui.cardinalityValidator.status === STATUS.RUNNING);
        const warningStatus = ($scope.ui.cardinalityValidator.status === STATUS.WARNING);
        const checkboxText = (validatorRunning) ? 'Validating cardinality...' : 'Enable model plot';

        const props = {
          checkboxDisabled,
          checkboxText,
          onCheckboxChange: $scope.handleCheckboxChange,
          warningContent: $scope.ui.cardinalityValidator.message,
          warningStatus,
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
