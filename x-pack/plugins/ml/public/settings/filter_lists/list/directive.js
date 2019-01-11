/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@kbn/i18n/react';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { getFilterListsBreadcrumbs } from '../../breadcrumbs';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, checkPermission } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { FilterLists } from './filter_lists';

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
    k7Breadcrumbs: getFilterListsBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
    }
  });

module.directive('mlFilterLists', function () {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function (scope, element) {
      const props = {
        canCreateFilter: checkPermission('canCreateFilter'),
        canDeleteFilter: checkPermission('canDeleteFilter'),
      };

      ReactDOM.render(
        <I18nProvider>
          {React.createElement(FilterLists, props)}
        </I18nProvider>,
        element[0]
      );
    }
  };
});
