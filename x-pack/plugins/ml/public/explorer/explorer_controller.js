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

import template from './explorer.html';

import uiRoutes from 'ui/routes';
import {
  createJobs,
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

import { APP_STATE_ACTION, EXPLORER_ACTION } from './explorer_constants';

uiRoutes
  .when('/explorer/?', {
    template,
    k7Breadcrumbs: getAnomalyExplorerBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: loadIndexPatterns,
    },
  });

import { uiModules } from 'ui/modules';
import { getFromSavedObject } from 'ui/index_patterns/static_utils';

const module = uiModules.get('apps/ml');

module.controller('MlExplorerController', function (
  $route,
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
  $scope.jobs = [];
  $scope.indexPatterns = $route.current ? $route.current.locals.indexPatterns.map(getFromSavedObject) : [];
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
  const tzConfig = config.get('dateFormat:tz');
  $scope.dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

  $scope.mlJobSelectService = Private(JobSelectServiceProvider);
  $scope.MlTimeBuckets = Private(IntervalHelperProvider);

  let resizeTimeout = null;

  mlExplorerDashboardService.init();

  function jobSelectionUpdate(action, { fullJobs, selectedCells, selectedJobIds }) {
    const jobs = createJobs(fullJobs).map((job) => {
      job.selected = selectedJobIds.some((id) => job.id === id);
      return job;
    });

    const selectedJobs = jobs.filter(job => job.selected);

    function fieldFormatServiceCallback() {
      $scope.jobs = jobs;
      $scope.$applyAsync();

      const noJobsFound = ($scope.jobs.length === 0);

      mlExplorerDashboardService.explorer.changed(action, {
        loading: false,
        noJobsFound,
        selectedCells,
        selectedJobs,
      });
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

  // Initialize the AppState in which to store swimlane settings.
  // AppState is used to store state in the URL.
  $scope.appState = new AppState({
    mlExplorerSwimlane: {},
  });

  // Load the job info needed by the dashboard, then do the first load.
  // Calling loadJobs() ensures the full datafeed config is available for building the charts.
  // Using this listener ensures the jobs will only be loaded and passed on after
  // <ml-explorer-react-wrapper /> and <Explorer /> have been initialized.
  function loadJobsListener(action) {
    if (action === EXPLORER_ACTION.LOAD_JOBS) {
      mlJobService.loadJobs()
        .then((resp) => {
          if (resp.jobs.length > 0) {
            // Select any jobs set in the global state (i.e. passed in the URL).
            const selectedJobIds = $scope.mlJobSelectService.getSelectedJobIds(true);
            let selectedCells;

            // keep swimlane selection, restore selectedCells from AppState
            if ($scope.appState.mlExplorerSwimlane.selectedType !== undefined) {
              selectedCells = {
                type: $scope.appState.mlExplorerSwimlane.selectedType,
                lanes: $scope.appState.mlExplorerSwimlane.selectedLanes,
                times: $scope.appState.mlExplorerSwimlane.selectedTimes,
                showTopFieldValues: $scope.appState.mlExplorerSwimlane.showTopFieldValues,
                viewByFieldName: $scope.appState.mlExplorerSwimlane.viewByFieldName,
              };
            }

            jobSelectionUpdate(EXPLORER_ACTION.INITIALIZE, {
              fullJobs: resp.jobs,
              selectedCells,
              selectedJobIds,
              swimlaneViewByFieldName: $scope.appState.mlExplorerSwimlane.viewByFieldName,
            });
          } else {
            mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.RELOAD, {
              loading: false,
              noJobsFound: true,
            });
          }
        })
        .catch((resp) => {
          console.log('Explorer - error getting job info from elasticsearch:', resp);
        });
    }
  }

  mlExplorerDashboardService.explorer.watch(loadJobsListener);

  // Listen for changes to job selection.
  $scope.mlJobSelectService.listenJobSelectionChange($scope, (event, selectedJobIds) => {
    jobSelectionUpdate(EXPLORER_ACTION.JOB_SELECTION_CHANGE, { fullJobs: mlJobService.jobs, selectedJobIds });
  });

  // Refresh all the data when the time range is altered.
  $scope.$listenAndDigestAsync(timefilter, 'fetch', () => {
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.RELOAD);
  });

  // Add a watcher for auto-refresh of the time filter to refresh all the data.
  const refreshWatcher = Private(refreshIntervalWatcher);
  refreshWatcher.init(async () => {
    mlExplorerDashboardService.explorer.changed(EXPLORER_ACTION.RELOAD);
  });

  // Redraw the swimlane when the window resizes or the global nav is toggled.
  function jqueryRedrawOnResize() {
    if (resizeTimeout !== null) {
      $timeout.cancel(resizeTimeout);
    }
    // Only redraw 100ms after last resize event.
    resizeTimeout = $timeout(redrawOnResize, 100);
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
      delete $scope.appState.mlExplorerSwimlane.showTopFieldValues;
    }

    if (action === APP_STATE_ACTION.SAVE_SELECTION) {
      const swimlaneSelectedCells = payload.swimlaneSelectedCells;
      $scope.appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
      $scope.appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
      $scope.appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
      $scope.appState.mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
      $scope.appState.mlExplorerSwimlane.viewByFieldName = swimlaneSelectedCells.viewByFieldName;

    }

    if (action === APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME) {
      $scope.appState.mlExplorerSwimlane.viewByFieldName = payload.swimlaneViewByFieldName;
    }

    $scope.appState.save();
    $scope.$applyAsync();
  });

  $scope.$on('$destroy', () => {
    mlExplorerDashboardService.explorer.unwatch(loadJobsListener);
    refreshWatcher.cancel();
    $(window).off('resize', jqueryRedrawOnResize);
    // Cancel listening for updates to the global nav state.
    navListener();
  });
});
