/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import ReactDOM from 'react-dom';
import React from 'react';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { loadIndexPatterns } from 'plugins/ml/util/index_utils';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { getJobManagementBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
import { loadNewJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';

import uiRoutes from 'ui/routes';

const template = `<ml-nav-menu name="jobs" /><jobs-page />`;

uiRoutes
  .when('/jobs/?', {
    template,
    k7Breadcrumbs: getJobManagementBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      indexPatterns: loadIndexPatterns,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
      loadNewJobDefaults,
    }
  });

import { JobsPage } from './jobs';
import { I18nContext } from 'ui/i18n';

module.directive('jobsPage', function () {
  return {
    scope: {},
    restrict: 'E',
    link: (scope, element) => {
      ReactDOM.render(
        <I18nContext>
          {React.createElement(JobsPage, { angularWrapperScope: scope })}
        </I18nContext>,
        element[0]
      );
    }
  };
});
