/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering Explorer dashboard swimlanes.
 */

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';

import { ExplorerSwimlane } from './explorer_swimlane';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlExplorerSwimlane', function ($compile, Private, mlExplorerDashboardService) {

  function link(scope, element) {
    let previousProps = null;
    // Re-render the swimlane whenever the underlying data changes.
    function swimlaneDataChangeListener(props) {
      if (props.swimlaneType !== scope.swimlaneType) {
        return;
      }

      if (props.swimlaneData === undefined) {
        return;
      }

      if (_.isEqual(props, previousProps) === false) {
        ReactDOM.render(
          React.createElement(ExplorerSwimlane, props),
          element[0]
        );
        previousProps = props;
      }
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
