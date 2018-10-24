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
import { checkLicenseExpired, checkBasicLicense } from 'plugins/ml/license/check_license';
import { preConfiguredJobRedirect } from 'plugins/ml/jobs/new_job/wizard/preconfigured_job_redirect';
import { checkCreateJobsPrivilege, checkFindFileStructurePrivilege } from 'plugins/ml/privilege/check_privilege';
import { loadIndexPatterns, getIndexPatterns } from 'plugins/ml/util/index_utils';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { initPromise } from 'plugins/ml/util/promise';
import template from './index_or_search.html';
import { timefilter } from 'ui/timefilter';

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
      indexPatterns: loadIndexPatterns,
      preConfiguredJobRedirect,
      checkMlNodesAvailable,
      initPromise: initPromise(true),
      nextStepPath: () => '#/jobs/new_job/step/job_type',
    }
  });

uiRoutes
  .when('/datavisualizer_index_select', {
    template,
    resolve: {
      CheckLicense: checkBasicLicense,
      privileges: checkFindFileStructurePrivilege,
      indexPatterns: loadIndexPatterns,
      initPromise: initPromise(true),
      nextStepPath: () => '#jobs/new_job/datavisualizer',
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlNewJobStepIndexOrSearch',
  function ($scope, $route) {

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page

    $scope.indexPatterns = getIndexPatterns();

    const path = $route.current.locals.nextStepPath;

    $scope.withIndexPatternUrl = function (pattern) {
      if (!pattern) {
        return;
      }
      return `${path}?index=${encodeURIComponent(pattern.id)}`;
    };

    $scope.withSavedSearchUrl = function (savedSearch) {
      if (!savedSearch) {
        return;
      }
      return `${path}?savedSearchId=${encodeURIComponent(savedSearch.id)}`;
    };
  });
