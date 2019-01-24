/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import ReactDOM from 'react-dom';

import { FieldTitleBar } from './field_title_bar';
import { I18nProvider } from '@kbn/i18n/react';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlFieldTitleBar', function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {
      card: '='
    },
    link: function (scope, element) {
      scope.$watch('card', updateComponent);

      updateComponent();

      function updateComponent() {
        const props = {
          card: scope.card
        };

        ReactDOM.render(
          <I18nProvider>
            {React.createElement(FieldTitleBar, props)}
          </I18nProvider>,
          element[0]
        );
      }
    }
  };
});
