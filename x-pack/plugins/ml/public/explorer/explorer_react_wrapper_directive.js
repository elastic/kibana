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

import { I18nContext } from 'ui/i18n';
import { mapScopeToProps } from './explorer_utils';

import { EXPLORER_ACTION } from './explorer_constants';
import { mlExplorerDashboardService } from './explorer_dashboard_service';

module.directive('mlExplorerReactWrapper', function () {
  function link(scope, element) {
    ReactDOM.render(
      <I18nContext>{React.createElement(Explorer, mapScopeToProps(scope))}</I18nContext>,
      element[0]
    );

    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.LOAD_JOBS);

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
