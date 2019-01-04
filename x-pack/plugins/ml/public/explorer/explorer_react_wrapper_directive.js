/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { Explorer } from './explorer';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nProvider } from '@kbn/i18n/react';

module.directive('mlExplorerReactWrapper', function () {
  function link(scope, element) {
    function render() {
      const props = {
        jobs: scope.jobs,
        loading: scope.loading,
      };

      ReactDOM.render(
        <I18nProvider>{React.createElement(Explorer, props)}</I18nProvider>,
        element[0]
      );
    }

    render();

    scope.$watch(() => {
      render();
    });

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });
  }

  return {
    scope: false,
    link,
  };
});
