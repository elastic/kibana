/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { CHART_STATE } from 'plugins/ml/jobs/new_job/simple/components/constants/states';
import template from './fields_selection.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFieldsSelection', function () {
  return {
    restrict: 'E',
    replace: true,
    template,
    controller: function ($scope) {
      $scope.toggleFields = (field) => {
        const key = field.id;

        const f = $scope.formConfig.fields[key];
        if (f === undefined) {
          $scope.formConfig.fields[key] = field;
          $scope.chartStates.fields[key] = CHART_STATE.LOADING;
        } else {
          delete $scope.formConfig.fields[key];
          delete $scope.chartStates.fields[key];
        }
        if ($scope.formConfig.splitField !== undefined) {
          $scope.setModelMemoryLimit();
        }
      };
    }
  };
});
