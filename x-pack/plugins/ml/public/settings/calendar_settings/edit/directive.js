/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);
// TODO: change to relative paths
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { initPromise } from 'plugins/ml/util/promise';

import uiRoutes from 'ui/routes';

const template = `
  <ml-nav-menu name="settings"></ml-nav-menu>
  <div class="ml-filter-lists">
    <ml-new-calendar></ml-new-calendar>
  </div>
`;

uiRoutes
  .when('/settings/calendars_list/new_calendar', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable,
      initPromise: initPromise(true)
    }
  })
  .when('/settings/calendars_list/edit_calendar/:calendarId', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable,
      initPromise: initPromise(true)
    }
  });

import { NewCalendar } from './new_calendar.js';

module.directive('mlNewCalendar', function ($route) {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function (scope, element) {
      const props = {
        calendarId: $route.current.params.calendarId
      };

      ReactDOM.render(
        React.createElement(NewCalendar, props),
        element[0]
      );
    }
  };
});
