/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Controller for the first step in the Create Job wizard, allowing the user to
 * select the Kibana index pattern or saved search to use for creating a job.
 */

import uiRoutes from 'ui/routes';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { preConfiguredJobRedirect } from 'plugins/ml/jobs/new_job/wizard/preconfigured_job_redirect';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { getIndexPatterns } from 'plugins/ml/util/index_utils';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import template from './index_or_search.html';

uiRoutes
  .when('/jobs/new_job', {
    redirectTo: '/jobs/new_job/step/index_or_search'
  });

uiRoutes
  .when('/jobs/new_job/step/index_or_search', {
    template,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPatterns: getIndexPatterns,
      preConfiguredJobRedirect,
      checkMlNodesAvailable
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlNewJobStepIndexOrSearch',
  function (
    $scope,
    $route,
    timefilter) {

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page

    $scope.indexPatterns = $route.current.locals.indexPatterns;

    $scope.withIndexPatternUrl = function (pattern) {
      if (!pattern) {
        return;
      }

      return '#/jobs/new_job/step/job_type?index=' + encodeURIComponent(pattern.id);
    };

    $scope.withSavedSearchUrl = function (savedSearch) {
      if (!savedSearch) {
        return;
      }

      return '#/jobs/new_job/step/job_type?savedSearchId=' + encodeURIComponent(savedSearch.id);
    };

  });
