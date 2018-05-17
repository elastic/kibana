/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import { FieldTypeIcon } from './field_type_icon_view.js';
import { ML_JOB_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFieldTypeIcon', function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      tooltipEnabled: '=',
      type: '='
    },
    link: function (scope, element) {
      scope.$watch('type', updateComponent);

      updateComponent();

      function updateComponent() {
        const props = {
          ML_JOB_FIELD_TYPES,
          tooltipEnabled: scope.tooltipEnabled,
          type: scope.type
        };

        ReactDOM.render(
          React.createElement(FieldTypeIcon, props),
          element[0]
        );
      }
    }
  };
});
