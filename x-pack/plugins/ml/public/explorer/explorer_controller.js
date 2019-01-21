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

import '../components/annotations_table';
import '../components/anomalies_table';
import '../components/controls';
import '../components/job_select_list';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import template from './explorer.html';

import uiRoutes from 'ui/routes';
import {
  createJobs,
  mapScopeToProps,
} from './explorer_utils';
import { getAnomalyExplorerBreadcrumbs } from './breadcrumbs';
import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { getIndexPatterns, loadIndexPatterns } from '../util/index_utils';
import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { JobSelectServiceProvider } from '../components/job_select_list/job_select_service';
import { mlExplorerDashboardService } from './explorer_dashboard_service';
import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { mlJobService } from '../services/job_service';
import { refreshIntervalWatcher } from '../util/refresh_interval_watcher';
import { timefilter } from 'ui/timefilter';

import { APP_STATE_ACTION, EXPLORER_ACTION, SWIMLANE_TYPE } from './explorer_constants';

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
  $injector,
  $scope,
  $timeout,
  AppState,
  Private,
  config,
) {
  // Even if they are not used directly anymore in this controller but via imports
  // in React components, because of the use of AppState and its dependency on angularjs
  // these services still need to be required here to properly initialize.
  $injector.get('mlCheckboxShowChartsService');
  $injector.get('mlSelectIntervalService');
  $injector.get('mlSelectLimitService');
  $injector.get('mlSelectSeverityService');

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
  $scope.MlTimeBuckets = Private(IntervalHelperProvider);

  let resizeTimeout = null;

  mlExplorerDashboardService.init();

  function jobSelectionUpdate(action, { fullJobs, selectedCells, selectedJobIds }) {
    let previousSelectedJobsCount = 0;
    if ($scope.jobs !== null) {
      previousSelectedJobsCount = $scope.jobs.filter(d => d.selected).length;
    }

    const jobs = createJobs(fullJobs).map((job) => {
      job.selected = selectedJobIds.some((id) => job.id === id);
      return job;
    });

    const selectedJobs = jobs.filter(job => job.selected);

    // Clear viewBy from the state if we are moving from single
    // to multi selection, or vice-versa.
    if (
      (previousSelectedJobsCount <= 1 && selectedJobs.length > 1) ||
      (selectedJobs.length === 1 && previousSelectedJobsCount > 1)
    ) {
      $scope.appStateHandler(APP_STATE_ACTION.CLEAR_SWIMLANE_VIEW_BY_FIELD_NAME);
    }

    function fieldFormatServiceCallback() {
      $scope.jobs = jobs;
      $scope.$applyAsync();

      mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.RENDER, mapScopeToProps($scope));
      mlExplorerDashboardService.explorer.changed(action, { selectedCells, selectedJobs });
    }

    // Populate the map of jobs / detectors / field formatters for the selected IDs.
    mlFieldFormatService.populateFormats(selectedJobIds, getIndexPatterns())
      .catch((err) => {
        console.log('Error populating field formats:', err);
      })
      .then(() => {
        fieldFormatServiceCallback();
      });
  }

  // Load the job info needed by the dashboard, then do the first load.
  // Calling loadJobs() ensures the full datafeed config is available for building the charts.
  mlJobService.loadJobs()
    .then((resp) => {
      // Initialize the AppState in which to store filters and swimlane settings.
      // AppState is used to store state in the URL.
      $scope.appState = new AppState({
        filters: [],
        mlExplorerSwimlane: {},
      });

      $scope.loading = false;
      $scope.$applyAsync();

      if (resp.jobs.length > 0) {
        // Select any jobs set in the global state (i.e. passed in the URL).
        const selectedJobIds = $scope.mlJobSelectService.getSelectedJobIds(true);
        let selectedCells;

        // keep swimlane selection, restore selectedCells from AppState
        if ($scope.appState.mlExplorerSwimlane.selectedType !== undefined) {
          selectedCells = {
            type: $scope.appState.mlExplorerSwimlane.selectedType,
            lanes: $scope.appState.mlExplorerSwimlane.selectedLanes,
            times: $scope.appState.mlExplorerSwimlane.selectedTimes
          };
          if (selectedCells.type === SWIMLANE_TYPE.VIEW_BY) {
            selectedCells.fieldName = $scope.appState.mlExplorerSwimlane.viewBy;
          }
        }

        jobSelectionUpdate(EXPLORER_ACTION.INITIALIZE, {
          fullJobs: resp.jobs,
          selectedCells,
          selectedJobIds,
          swimlaneViewByFieldName: $scope.appState.mlExplorerSwimlane.viewBy
        });
      }
    })
    .catch((resp) => {
      console.log('Explorer - error getting job info from elasticsearch:', resp);
    });

  // Listen for changes to job selection.
  $scope.mlJobSelectService.listenJobSelectionChange($scope, (event, selectedJobIds) => {
    jobSelectionUpdate(EXPLORER_ACTION.JOB_SELECTION_CHANGE, { fullJobs: mlJobService.jobs, selectedJobIds });
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

  $scope.appStateHandler = ((action, payload) => {
    $scope.appState.fetch();

    if (action === APP_STATE_ACTION.CLEAR_SELECTION) {
      delete $scope.appState.mlExplorerSwimlane.selectedType;
      delete $scope.appState.mlExplorerSwimlane.selectedLanes;
      delete $scope.appState.mlExplorerSwimlane.selectedTimes;
    }

    if (action === APP_STATE_ACTION.SAVE_SELECTION) {
      const swimlaneSelectedCells = payload.swimlaneSelectedCells;
      $scope.appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
      $scope.appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
      $scope.appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
    }

    if (action === APP_STATE_ACTION.CLEAR_SWIMLANE_VIEW_BY_FIELD_NAME) {
      delete $scope.appState.mlExplorerSwimlane.viewBy;
    }

    if (action === APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME) {
      $scope.appState.mlExplorerSwimlane.viewBy = payload.swimlaneViewByFieldName;
    }

    $scope.appState.save();
    $scope.$applyAsync();
  });

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
