/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './field_type_icon.html';
import { ML_JOB_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFieldTypeIcon', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      type: '='
    },
    template,
    controller: function ($scope) {
      $scope.ML_JOB_FIELD_TYPES = ML_JOB_FIELD_TYPES;
    }
  };
});
