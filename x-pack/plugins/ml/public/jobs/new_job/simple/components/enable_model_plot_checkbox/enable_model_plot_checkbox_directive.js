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
        FINISHED: 2,
        WARNING: 3,
      };
      const errorHandler = (error) => {
        console.log('Cardinality could not be validated', error);
        $scope.ui.cardinalityValidator.status = STATUS.FAILED;
        $scope.ui.cardinalityValidator.message = 'Cardinality could not be validated';
      };

      // [{id:"cardinality_model_plot_high",modelPlotCardinality:11405}, {id:"cardinality_partition_field",fieldName:"clientip"}]
      // Model plot cardinality is the only thing we care about
      const getModelPlotCardinality = (data) => {
        let cardinality;

        for (let i = 0; i < data.length; i++) {
          if (data[i].id === 'cardinality_model_plot_high') {
            cardinality = data[i].modelPlotCardinality;
            break;
          }
        }

        return cardinality;
      };

      // Successful validation: [{ id: 'success_cardinality' }]
      const hasSuccessMessage = (data) => {
        return (
          Array.isArray(data) &&
          (data.length === 1) &&
          (data[0].id === 'success_cardinality')
        );
      };

      const isSuccessfulValidation = (data) => {
        const highModelPlotCardinality = getModelPlotCardinality(data);

        return {
          success: hasSuccessMessage(data),
          highCardinality: highModelPlotCardinality,
        };
      };

      const validateCardinality = function () {
        $scope.ui.cardinalityValidator.status = STATUS.RUNNING;
        $scope.ui.cardinalityValidator.message = '';

        // create temporary job since cardinality validation expects that format -> Note: need to clear out tempJob somewhere?
        const tempJob = $scope.getJobFromConfig($scope.formConfig);

        ml.validateCardinality(tempJob)
          .then((response) => {
            console.log(response); // remove
            const validationResult = isSuccessfulValidation(response);

            if (validationResult.success === true && validationResult.highCardinality === undefined) {
              $scope.formConfig.enableModelPlot = true;
              $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
            } else {
              console.log('Validation not successful', response); // remove
              $scope.ui.cardinalityValidator.message = `The estimated cardinality of ${validationResult.highCardinality}
                of fields relevant to creating model plots might result in resource intensive jobs.`;
              $scope.ui.cardinalityValidator.status = STATUS.WARNING;
            }
          })
          .catch(errorHandler);
      };

      // Re-validate cardinality for updated fields/splitField
      // when enable model plot is checked and form valid
      const revalidateCardinalityOnFieldChange = () => {
        if ($scope.formConfig.enableModelPlot === true && $scope.ui.formValid === true) {
          validateCardinality();
        }
      };

      $scope.handleCheckboxChange = (isChecked) => {
        if (isChecked) {
          $scope.formConfig.enableModelPlot = true;
          validateCardinality();
        } else {
          $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
          $scope.ui.cardinalityValidator.message = '';
          $scope.formConfig.enableModelPlot = false;
        }
      };

      // Update checkbox on these changes
      $scope.$watch('ui.formValid', updateCheckbox, true);
      $scope.$watch('ui.cardinalityValidator.status', updateCheckbox, true);
      // Fire off cardinality validatation when fields and/or split by field is updated
      $scope.$watch('formConfig.fields', revalidateCardinalityOnFieldChange, true);
      $scope.$watch('formConfig.splitField', revalidateCardinalityOnFieldChange, true);

      function updateCheckbox() {
        const checkboxDisabled = (
          $scope.ui.cardinalityValidator.status === STATUS.RUNNING ||
          $scope.ui.formValid !== true
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
