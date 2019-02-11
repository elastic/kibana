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

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { checkMlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { getCreateCalendarBreadcrumbs, getEditCalendarBreadcrumbs } from '../../breadcrumbs';

import uiRoutes from 'ui/routes';

import { I18nContext } from 'ui/i18n';

const template = `
  <ml-nav-menu name="settings" />
  <div class="mlCalendarManagement">
    <ml-new-calendar />
  </div>
`;

uiRoutes
  .when('/settings/calendars_list/new_calendar', {
    template,
    k7Breadcrumbs: getCreateCalendarBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable,
    }
  })
  .when('/settings/calendars_list/edit_calendar/:calendarId', {
    template,
    k7Breadcrumbs: getEditCalendarBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable,
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
        calendarId: $route.current.params.calendarId,
        canCreateCalendar: checkPermission('canCreateCalendar'),
        canDeleteCalendar: checkPermission('canDeleteCalendar')
      };

      ReactDOM.render(
        <I18nContext>
          {React.createElement(NewCalendar, props)}
        </I18nContext>,
        element[0]
      );
    }
  };
});
