/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Controller for the second step in the Create Job wizard, allowing
 * the user to select the type of job they wish to create.
 */

import uiRoutes from 'ui/routes';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { SearchItemsProvider } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { addItemToRecentlyAccessed } from 'plugins/ml/util/recently_accessed';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { initPromise } from 'plugins/ml/util/promise';
import template from './job_type.html';
import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/jobs/new_job/step/job_type', {
    template,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
      initPromise: initPromise(true)
    }
  });


import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlNewJobStepJobType',
  function (
    $scope,
    Private) {

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page

    const createSearchItems = Private(SearchItemsProvider);
    const {
      indexPattern,
      savedSearch } = createSearchItems();

    // check to see that the index pattern is time based.
    // if it isn't, display a warning and disable all links
    $scope.indexWarningTitle = '';
    $scope.isTimeBasedIndex = timeBasedIndexCheck(indexPattern);
    if ($scope.isTimeBasedIndex === false) {
      $scope.indexWarningTitle = (savedSearch.id === undefined) ? `Index pattern ${indexPattern.title} is not time based` :
        `${savedSearch.title} uses index pattern ${indexPattern.title} which is not time based`;
    }

    $scope.indexPattern = indexPattern;
    $scope.savedSearch = savedSearch;
    $scope.recognizerResults = { count: 0 };

    $scope.pageTitleLabel = (savedSearch.id !== undefined) ?
      `saved search ${savedSearch.title}` : `index pattern ${indexPattern.title}`;

    $scope.getUrl = function (basePath) {
      return (savedSearch.id === undefined) ? `${basePath}?index=${indexPattern.id}` :
        `${basePath}?savedSearchId=${savedSearch.id}`;
    };

    $scope.addSelectionToRecentlyAccessed = function () {
      const title = (savedSearch.id === undefined) ? indexPattern.title : savedSearch.title;
      const url = $scope.getUrl('');
      addItemToRecentlyAccessed('jobs/new_job/datavisualizer', title, url);
    };

  });
