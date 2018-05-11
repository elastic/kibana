/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import './styles/main.less';

// import angular from 'angular';
import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { Tooltip } from './tooltip_view_legacy';

module.directive('mlTooltip', function ($compile) {
  const link = function (scope, element) {
    const content = element.html();
    element.html('');

    const props = {
      text: scope.text,
      transclude: (el) => {
        const transcludeScope = scope.$new();
        const compiled = $compile(content)(transcludeScope);
        el.append(compiled[0]);
      }
    };

    ReactDOM.render(
      React.createElement(Tooltip, props),
      element[0]
    );
  };

  return {
    restrict: 'A',
    replace: true,
    scope: false,
    transclude: false,
    link
  };
});