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

import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../privilege/check_privilege';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { getSettingsBreadcrumbs } from './breadcrumbs';

import { I18nContext } from 'ui/i18n';
import uiRoutes from 'ui/routes';
import { timefilter } from 'ui/timefilter';

const template = `
  <ml-nav-menu name="settings" />
  <div class="mlSettingsPage">
    <ml-settings />
  </div>
`;

uiRoutes
  .when('/settings', {
    template,
    k7Breadcrumbs: getSettingsBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
    }
  });


import { Settings } from './settings.js';

module.directive('mlSettings', function () {

  timefilter.disableTimeRangeSelector(); // remove time picker from top of page
  timefilter.disableAutoRefreshSelector(); // remove time picker from top of page

  const canGetFilters = checkPermission('canGetFilters');
  const canGetCalendars = checkPermission('canGetCalendars');

  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function (scope, element) {
      ReactDOM.render(
        <I18nContext>
          {React.createElement(
            Settings, {
              canGetFilters,
              canGetCalendars
            })
          }
        </I18nContext>,
        element[0]
      );
    }
  };
});
