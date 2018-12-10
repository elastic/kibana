/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's ExplorerSwimlane React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { ExplorerSwimlane } from './explorer_swimlane';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { mlExplorerDashboardService } from './explorer_dashboard_service';

module.directive('mlExplorerSwimlane', function () {

  function link(scope, element) {
    function swimlaneDataChangeListener(props) {
      if (
        props.swimlaneType !== scope.swimlaneType ||
        props.swimlaneData === undefined ||
        props.swimlaneData.earliest === undefined ||
        props.swimlaneData.latest === undefined
      ) {
        return;
      }

      ReactDOM.render(
        React.createElement(ExplorerSwimlane, props),
        element[0]
      );
    }
    mlExplorerDashboardService.swimlaneDataChange.watch(swimlaneDataChangeListener);

    element.on('$destroy', () => {
      mlExplorerDashboardService.swimlaneDataChange.unwatch(swimlaneDataChangeListener);
      // unmountComponentAtNode() needs to be called so dragSelectListener within
      // the ExplorerSwimlane component gets unwatched properly.
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });
  }

  return {
    scope: {
      swimlaneType: '@'
    },
    link
  };
});
