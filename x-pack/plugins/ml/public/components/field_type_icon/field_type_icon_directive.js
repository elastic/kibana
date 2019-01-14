/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import { FieldTypeIcon } from './field_type_icon.js';
import { I18nProvider } from '@kbn/i18n/react';

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
          tooltipEnabled: scope.tooltipEnabled,
          type: scope.type
        };

        ReactDOM.render(
          <I18nProvider>
            {React.createElement(FieldTypeIcon, props)}
          </I18nProvider>,
          element[0]
        );
      }
    }
  };
});
