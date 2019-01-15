/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Angular controller for the Machine Learning Explorer dashboard. The controller makes
 * multiple queries to Elasticsearch to obtain the data to populate all the components
 * in the view.
 */

import $ from 'jquery';
import moment from 'moment-timezone';

import 'plugins/ml/components/annotations_table';
import 'plugins/ml/components/anomalies_table';
import 'plugins/ml/components/controls';
import 'plugins/ml/components/job_select_list';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import template from './explorer.html';

import uiRoutes from 'ui/routes';
import {
  createJobs,
  mapScopeToProps,
} from './explorer_utils';
import { getAnomalyExplorerBreadcrumbs } from './breadcrumbs';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { loadIndexPatterns } from 'plugins/ml/util/index_utils';
import { refreshIntervalWatcher } from 'plugins/ml/util/refresh_interval_watcher';
import { mlExplorerDashboardService } from './explorer_dashboard_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { JobSelectServiceProvider } from 'plugins/ml/components/job_select_list/job_select_service';
import { timefilter } from 'ui/timefilter';

import { EXPLORER_ACTION } from './explorer_constants';

uiRoutes
  .when('/explorer/?', {
    template,
    k7Breadcrumbs: getAnomalyExplorerBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: loadIndexPatterns,
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlExplorerController', function (
  $scope,
  $timeout,
  AppState,
  Private,
  config,

  // Even if they are not used directly anymore in this controller but via imports
  // in React components, because of the use of AppState and its dependency on angularjs
  // these services still need to be required here to properly initialize.
  mlCheckboxShowChartsService, // eslint-disable-line no-unused-vars
  mlSelectIntervalService,     // eslint-disable-line no-unused-vars
  mlSelectLimitService,        // eslint-disable-line no-unused-vars
  mlSelectSeverityService      // eslint-disable-line no-unused-vars
) {
  // Initialize the AppState in which to store filters and swimlane settings.
  // AppState is used to store state in the URL.
  const appState = new AppState({
    filters: [],
    mlExplorerSwimlane: {},
  });

  // $scope should only contain what's actually still necessary for the angular part.
  // For the moment that's the job selector and the (hidden) filter bar.
  $scope.loading = true;
  $scope.jobs = [];
  $scope.queryFilters = [];
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
  const tzConfig = config.get('dateFormat:tz');
  $scope.dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

  const queryFilter = Private(FilterBarQueryFilterProvider);
  $scope.mlJobSelectService = Private(JobSelectServiceProvider);

  let resizeTimeout = null;

  mlExplorerDashboardService.init();

  // Load the job info needed by the dashboard, then do the first load.
  // Calling loadJobs() ensures the full datafeed config is available for building the charts.
  mlJobService.loadJobs().then(async (resp) => {
    if (resp.jobs.length > 0) {
      $scope.jobs = createJobs(resp.jobs);

      // Select any jobs set in the global state (i.e. passed in the URL).
      $scope.mlJobSelectService.getSelectedJobIds(true);
      $scope.jobs = createJobs(mlJobService.jobs);
    }

    $scope.loading = false;
    $scope.$applyAsync();
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.RENDER, mapScopeToProps($scope, appState));
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.INITIALIZE);
  }).catch((resp) => {
    console.log('Explorer - error getting job info from elasticsearch:', resp);
  });

  function overallRefresh() {
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.REFRESH);
  }

  // Refresh all the data when the time range is altered.
  $scope.$listenAndDigestAsync(timefilter, 'fetch', () => {
    overallRefresh();
  });

  // Add a watcher for auto-refresh of the time filter to refresh all the data.
  const refreshWatcher = Private(refreshIntervalWatcher);
  refreshWatcher.init(async () => {
    overallRefresh();
  });

  // Listen for changes to job selection.
  $scope.mlJobSelectService.listenJobSelectionChange($scope, async (event, selections) => {
    $scope.jobs = createJobs(mlJobService.jobs);
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.RENDER, mapScopeToProps($scope, appState));
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.JOB_SELECTION_CHANGE, {
      jobs: $scope.jobs,
      selections,
    });
  });

  // Redraw the swimlane when the window resizes or the global nav is toggled.
  function jqueryRedrawOnResize() {
    if (resizeTimeout !== null) {
      $timeout.cancel(resizeTimeout);
    }
    // Only redraw 500ms after last resize event.
    resizeTimeout = $timeout(redrawOnResize, 500);
  }
  $(window).resize(jqueryRedrawOnResize);

  const navListener = $scope.$on('globalNav:update', () => {
    // Run in timeout so that content pane has resized after global nav has updated.
    $timeout(() => {
      redrawOnResize();
    }, 300);
  });

  function redrawOnResize() {
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.REDRAW);
  }

  // Refresh the data when the dashboard filters are updated.
  $scope.$listen(queryFilter, 'update', () => {
    // TODO - add in filtering functionality.
    $scope.queryFilters = queryFilter.getFilters();
    console.log('explorer_controller queryFilter update, filters:', $scope.queryFilters);
  });

  $scope.$on('$destroy', () => {
    refreshWatcher.cancel();
    $(window).off('resize', jqueryRedrawOnResize);
    // Cancel listening for updates to the global nav state.
    navListener();
  });
});
