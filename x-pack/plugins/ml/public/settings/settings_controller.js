/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import uiRoutes from 'ui/routes';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, checkPermission } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { initPromise } from 'plugins/ml/util/promise';

import template from './settings.html';

import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/settings', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      initPromise: initPromise(true)
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlSettings', function ($scope) {

  timefilter.disableTimeRangeSelector(); // remove time picker from top of page
  timefilter.disableAutoRefreshSelector(); // remove time picker from top of page

  $scope.canCreateFilter = checkPermission('canCreateFilter');
});
