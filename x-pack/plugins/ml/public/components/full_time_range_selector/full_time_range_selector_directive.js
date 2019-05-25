/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { I18nContext } from 'ui/i18n';

import { FullTimeRangeSelector } from './index';

// Angular directive wrapper for the 'Use full time range' button.
module.directive('mlFullTimeRangeSelector', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      indexPattern: '=',
      disabled: '=',
      query: '='
    },
    link: (scope, element) => {

      function renderComponent() {
        const props = {
          indexPattern: scope.indexPattern,
          query: scope.query,
          disabled: scope.disabled
        };

        ReactDOM.render(
          <I18nContext>
            {React.createElement(FullTimeRangeSelector, props)}
          </I18nContext>,
          element[0]
        );
      }

      renderComponent();

      // As the directive is only used in the job wizards and the data visualizer,
      // it is safe to only watch the disabled property.
      scope.$watch('disabled', renderComponent);

      element.on('$destroy', () => {
        scope.$destroy();
      });

    }

  };
});
