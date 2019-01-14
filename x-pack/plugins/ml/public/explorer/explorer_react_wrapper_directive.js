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
import { mlExplorerDashboardService } from './explorer_dashboard_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nProvider } from '@kbn/i18n/react';

module.directive('mlExplorerReactWrapper', function () {
  function link(scope, element) {
    function render(props) {
      ReactDOM.render(
        <I18nProvider>{React.createElement(Explorer, props)}</I18nProvider>,
        element[0]
      );
    }

    mlExplorerDashboardService.explorer.watch(render);

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      mlExplorerDashboardService.explorer.unwatch(render);
      scope.$destroy();
    });
  }

  return {
    scope: false,
    link,
  };
});
