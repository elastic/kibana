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
    <ml-edit-filter-list></ml-edit-filter-list>
  </div>
`;

uiRoutes
  .when('/settings/filter_lists/new_filter_list', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      initPromise: initPromise(false)
    }
  })
  .when('/settings/filter_lists/edit_filter_list/:filterId', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      initPromise: initPromise(false)
    }
  });


import { EditFilterList } from './edit_filter_list';

module.directive('mlEditFilterList', function ($route) {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function (scope, element) {
      const props = {
        filterId: $route.current.params.filterId
      };

      ReactDOM.render(
        React.createElement(EditFilterList, props),
        element[0]
      );
    }
  };
});
