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

import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { initPromise } from 'plugins/ml/util/promise';

import uiRoutes from 'ui/routes';

const template = `
  <ml-nav-menu name="settings"></ml-nav-menu>
  <div class="ml-filter-lists">
    <ml-filter-lists></ml-filter-lists>
  </div>
`;

uiRoutes
  .when('/settings/filter_lists', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      initPromise: initPromise(false)
    }
  });


import { FilterLists } from './filter_lists';

module.directive('mlFilterLists', function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function (scope, element) {
      ReactDOM.render(
        React.createElement(FilterLists),
        element[0]
      );
    }
  };
});
