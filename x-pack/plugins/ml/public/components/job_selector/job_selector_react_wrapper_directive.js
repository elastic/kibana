/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Job Selector React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash'; // Find a way to remove this

import { JobSelector } from './job_selector';
import { getSelectedJobIds } from './job_select_service_utils';
import { BehaviorSubject } from 'rxjs';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');


module
  .directive('mlJobSelectorReactWrapper', function (globalState, config, mlJobSelectService) {
    function link(scope, element, attrs) {
      const selectedJobIds = getSelectedJobIds(globalState);
      const oldSelectedJobIds = mlJobSelectService.getValue().selection;

      if (selectedJobIds && !(_.isEqual(oldSelectedJobIds, selectedJobIds))) {
        mlJobSelectService.next({ selection: selectedJobIds });
      }

      const props = {
        config,
        globalState,
        jobSelectService: mlJobSelectService,
        selectedJobIds,
        timeseriesOnly: attrs.timeseriesonly,
        singleSelection: attrs.singleselection
      };

      ReactDOM.render(React.createElement(JobSelector, props),
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    }

    return {
      scope: false,
      link,
    };
  })
  .service('mlJobSelectService', function (globalState) {
    const initialSelectedJobIds = getSelectedJobIds(globalState);
    return new BehaviorSubject({ selection: initialSelectedJobIds, resetSelection: false });
  });
