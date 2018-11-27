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

import _ from 'lodash';
import $ from 'jquery';
import DragSelect from 'dragselect';
import moment from 'moment-timezone';

import 'plugins/ml/components/anomalies_table';
import 'plugins/ml/components/controls';
import 'plugins/ml/components/influencers_list';
import 'plugins/ml/components/job_select_list';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { parseInterval } from 'ui/utils/parse_interval';
import { initPromise } from 'plugins/ml/util/promise';
import template from './explorer.html';

import uiRoutes from 'ui/routes';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { loadIndexPatterns, getIndexPatterns } from 'plugins/ml/util/index_utils';
import { refreshIntervalWatcher } from 'plugins/ml/util/refresh_interval_watcher';
import { IntervalHelperProvider, getBoundsRoundedToInterval } from 'plugins/ml/util/ml_time_buckets';
import { ml } from 'plugins/ml/services/ml_api_service';
import { mlExplorerDashboardService } from './explorer_dashboard_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { JobSelectServiceProvider } from 'plugins/ml/components/job_select_list/job_select_service';
import { isTimeSeriesViewDetector } from 'plugins/ml/../common/util/job_utils';
import { timefilter } from 'ui/timefilter';
import {
  DRAG_SELECT_ACTION,
  SWIMLANE_DEFAULT_LIMIT,
  SWIMLANE_TYPE
} from './explorer_constants';

uiRoutes
  .when('/explorer/?', {
    template,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: loadIndexPatterns,
      initPromise: initPromise(true)
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

function getDefaultViewBySwimlaneData() {
  return {
    fieldName: '',
    laneLabels: [],
    points: [],
    interval: 3600
  };
}


module.controller('MlExplorerController', function (
  $scope,
  $timeout,
  AppState,
  Private,
  config,
  mlCheckboxShowChartsService,
  mlSelectLimitService,
  mlSelectIntervalService,
  mlSelectSeverityService) {

  $scope.anomalyChartRecords = [];
  $scope.timeFieldName = 'timestamp';
  $scope.loading = true;
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

  const TimeBuckets = Private(IntervalHelperProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const mlJobSelectService = Private(JobSelectServiceProvider);

  let resizeTimeout = null;

  const $mlExplorer = $('.ml-explorer');
  const MAX_INFLUENCER_FIELD_VALUES = 10;
  const MAX_CATEGORY_EXAMPLES = 10;
  const VIEW_BY_JOB_LABEL = 'job ID';

  const ALLOW_CELL_RANGE_SELECTION = mlExplorerDashboardService.allowCellRangeSelection;
  // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
  let disableDragSelectOnMouseLeave = true;
  // skip listening to clicks on swimlanes while they are loading to avoid race conditions
  let skipCellClicks = true;
  $scope.queryFilters = [];

  const dragSelect = new DragSelect({
    selectables: document.getElementsByClassName('sl-cell'),
    callback(elements) {
      if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
        elements = [elements[0]];
      }

      if (elements.length > 0) {
        mlExplorerDashboardService.dragSelect.changed({
          action: DRAG_SELECT_ACTION.NEW_SELECTION,
          elements
        });
      }

      disableDragSelectOnMouseLeave = true;
    },
    onDragStart() {
      if (ALLOW_CELL_RANGE_SELECTION) {
        mlExplorerDashboardService.dragSelect.changed({
          action: DRAG_SELECT_ACTION.DRAG_START
        });
        disableDragSelectOnMouseLeave = false;
      }
    },
    onElementSelect() {
      if (ALLOW_CELL_RANGE_SELECTION) {
        mlExplorerDashboardService.dragSelect.changed({
          action: DRAG_SELECT_ACTION.ELEMENT_SELECT
        });
      }
    }
  });

  $scope.selectedJobs = null;

  $scope.getSelectedJobIds = function () {
    const selectedJobs = _.filter($scope.jobs, job => job.selected);
    return _.map(selectedJobs, job => job.id);
  };

  $scope.viewBySwimlaneOptions = [];
  $scope.viewBySwimlaneData = getDefaultViewBySwimlaneData();


  let isChartsContainerInitialized = false;
  let chartsCallback = () => {};
  function initializeAfterChartsContainerDone() {
    if (isChartsContainerInitialized === false) {
      chartsCallback();
    }
    isChartsContainerInitialized = true;
  }

  $scope.initializeVis = function () {
    // Initialize the AppState in which to store filters.
    const stateDefaults = {
      filters: [],
      mlExplorerSwimlane: {}
    };
    $scope.appState = new AppState(stateDefaults);
    $scope.jobs = [];

    // Load the job info needed by the dashboard, then do the first load.
    // Calling loadJobs() ensures the full datafeed config is available for building the charts.
    mlJobService.loadJobs().then((resp) => {
      if (resp.jobs.length > 0) {
        $scope.jobs = createJobs(resp.jobs);

        // Select any jobs set in the global state (i.e. passed in the URL).
        const selectedJobIds = mlJobSelectService.getSelectedJobIds(true);
        $scope.setSelectedJobs(selectedJobIds, true);
      } else {
        $scope.loading = false;
      }

    }).catch((resp) => {
      console.log('Explorer - error getting job info from elasticsearch:', resp);
    });

    mlExplorerDashboardService.init();
    mlExplorerDashboardService.chartsInitDone.watch(initializeAfterChartsContainerDone);
  };

  // create new job objects based on standard job config objects
  // new job objects just contain job id, bucket span in seconds and a selected flag.
  function createJobs(jobs) {
    return jobs.map(job => {
      const bucketSpan = parseInterval(job.analysis_config.bucket_span);
      return { id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() };
    });
  }

  function restoreCellDataFromAppState() {
    // restore cellData from AppState
    if (
      $scope.cellData === undefined &&
      $scope.appState.mlExplorerSwimlane.selectedType !== undefined
    ) {
      $scope.cellData = {
        type: $scope.appState.mlExplorerSwimlane.selectedType,
        lanes: $scope.appState.mlExplorerSwimlane.selectedLanes,
        times: $scope.appState.mlExplorerSwimlane.selectedTimes
      };
      if ($scope.cellData.type === SWIMLANE_TYPE.VIEW_BY) {
        $scope.cellData.fieldName = $scope.appState.mlExplorerSwimlane.viewBy;
      }
      $scope.swimlaneViewByFieldName = $scope.appState.mlExplorerSwimlane.viewBy;
    }
  }

  $scope.setSelectedJobs = function (selectedIds, keepSwimlaneSelection = false) {
    let previousSelected = 0;
    if ($scope.selectedJobs !== null) {
      previousSelected = $scope.selectedJobs.length;
    }

    // Check for any new jobs created since the page was first loaded,
    // and whether any of the jobs have influencers configured (in which
    // case the Top Influencers section will be hidden).
    let recreateJobs = false;
    let hasInfluencers = false;
    selectedIds.forEach((id) => {
      if (recreateJobs === false && _.find($scope.jobs, { id }) === undefined) {
        recreateJobs = true;
      }

      const job = mlJobService.getJob(id);
      let influencers = [];
      if (job !== undefined) {
        influencers = job.analysis_config.influencers || [];
      }
      hasInfluencers = hasInfluencers || influencers.length > 0;
    });

    if (recreateJobs === true) {
      $scope.jobs = createJobs(mlJobService.jobs);
    }
    $scope.noInfluencersConfigured = !hasInfluencers;

    // update the jobs' selected flag
    $scope.selectedJobs = [];
    _.each($scope.jobs, (job) => {
      job.selected = (_.indexOf(selectedIds, job.id) !== -1);
      if (job.selected) {
        $scope.selectedJobs.push(job);
      }
    });

    // Clear viewBy from the state if we are moving from single
    // to multi selection, or vice-versa.
    $scope.appState.fetch();
    if ((previousSelected <= 1 && $scope.selectedJobs.length > 1) ||
      ($scope.selectedJobs.length === 1 && previousSelected > 1)) {
      delete $scope.appState.mlExplorerSwimlane.viewBy;
    }
    $scope.appState.save();

    // Populate the map of jobs / detectors / field formatters for the selected IDs.
    mlFieldFormatService.populateFormats(selectedIds, getIndexPatterns())
      .catch((err) => { console.log('Error populating field formats:', err); })
      .then(() => {
        // Load the data - if the FieldFormats failed to populate
        // the default formatting will be used for metric values.
        loadOverallData();
        if (keepSwimlaneSelection === false) {
          clearSelectedAnomalies();
        } else {
          restoreCellDataFromAppState();
          updateExplorer();
        }
      });
  };

  $scope.setSwimlaneSelectActive = function (active) {
    if (!active && disableDragSelectOnMouseLeave) {
      dragSelect.clearSelection();
      dragSelect.stop();
      return;
    }

    dragSelect.start();
  };

  $scope.setSwimlaneViewBy = function (viewByFieldName) {
    $scope.swimlaneViewByFieldName = viewByFieldName;

    // Save the 'view by' field name to the AppState so that it can restored from the URL.
    $scope.appState.fetch();
    $scope.appState.mlExplorerSwimlane.viewBy = viewByFieldName;
    $scope.appState.save();

    loadViewBySwimlane([]);
    clearSelectedAnomalies();
  };

  // Refresh all the data when the time range is altered.
  $scope.$listenAndDigestAsync(timefilter, 'fetch', () => {
    loadOverallData();
    clearSelectedAnomalies();
  });

  // Add a watcher for auto-refresh of the time filter to refresh all the data.
  const refreshWatcher = Private(refreshIntervalWatcher);
  refreshWatcher.init(() => {
    loadOverallData();
    // TODO - would be better to only clear and reload the selected anomalies
    // if the previous selection was no longer applicable.
    clearSelectedAnomalies();
  });

  // Listen for changes to job selection.
  mlJobSelectService.listenJobSelectionChange($scope, (event, selections) => {
    clearSwimlaneSelectionFromAppState();
    $scope.setSelectedJobs(selections);
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

  function clearSwimlaneSelectionFromAppState() {
    $scope.appState.fetch();
    delete $scope.appState.mlExplorerSwimlane.selectedType;
    delete $scope.appState.mlExplorerSwimlane.selectedLanes;
    delete $scope.appState.mlExplorerSwimlane.selectedTimes;
    $scope.appState.save();
  }

  function getSwimlaneData(swimlaneType) {
    switch (swimlaneType) {
      case SWIMLANE_TYPE.OVERALL:
        return $scope.overallSwimlaneData;
      case SWIMLANE_TYPE.VIEW_BY:
        return $scope.viewBySwimlaneData;
    }
  }

  function mapScopeToSwimlaneProps(swimlaneType) {
    return {
      chartWidth: $scope.swimlaneWidth,
      MlTimeBuckets: TimeBuckets,
      swimlaneData: getSwimlaneData(swimlaneType),
      swimlaneType,
      selection: $scope.appState.mlExplorerSwimlane
    };
  }

  function redrawOnResize() {
    $scope.swimlaneWidth = getSwimlaneContainerWidth();
    $scope.$apply();

    mlExplorerDashboardService.swimlaneDataChange.changed(mapScopeToSwimlaneProps(SWIMLANE_TYPE.OVERALL));
    mlExplorerDashboardService.swimlaneDataChange.changed(mapScopeToSwimlaneProps(SWIMLANE_TYPE.VIEW_BY));

    if (
      mlCheckboxShowChartsService.state.get('showCharts') &&
      $scope.anomalyChartRecords.length > 0
    ) {
      const timerange = getSelectionTimeRange($scope.cellData);
      mlExplorerDashboardService.anomalyDataChange.changed(
        $scope.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
      );
    }
  }

  // Refresh the data when the dashboard filters are updated.
  $scope.$listen(queryFilter, 'update', () => {
    // TODO - add in filtering functionality.
    $scope.queryFilters = queryFilter.getFilters();
    console.log('explorer_controller queryFilter update, filters:', $scope.queryFilters);
  });

  $scope.initializeVis();

  $scope.showViewBySwimlane = function () {
    return $scope.viewBySwimlaneData !== null && $scope.viewBySwimlaneData.laneLabels && $scope.viewBySwimlaneData.laneLabels.length > 0;
  };

  function getSelectionTimeRange(cellData) {
    // Returns the time range of the cell(s) currently selected in the swimlane.
    // If no cell(s) are currently selected, returns the dashboard time range.
    const bounds = timefilter.getActiveBounds();
    let earliestMs = bounds.min.valueOf();
    let latestMs = bounds.max.valueOf();

    if (cellData !== undefined && cellData.times !== undefined) {
      // time property of the cell data is an array, with the elements being
      // the start times of the first and last cell selected.
      earliestMs = (cellData.times[0] !== undefined) ? cellData.times[0] * 1000 : bounds.min.valueOf();
      latestMs = bounds.max.valueOf();
      if (cellData.times[1] !== undefined) {
        // Subtract 1 ms so search does not include start of next bucket.
        const interval = $scope.swimlaneBucketInterval.asSeconds();
        latestMs = ((cellData.times[1] + interval) * 1000) - 1;
      }
    }

    return { earliestMs, latestMs };
  }

  function getSelectionInfluencers(cellData) {
    const influencers = [];

    if (
      cellData !== undefined &&
      cellData.fieldName !== undefined &&
      cellData.fieldName !== VIEW_BY_JOB_LABEL
    ) {
      cellData.lanes.forEach((laneLabel) =>{
        influencers.push({ fieldName: $scope.swimlaneViewByFieldName, fieldValue: laneLabel });
      });
    }

    return influencers;
  }

  // This queue tracks click events while the swimlanes are loading.
  // To avoid race conditions we keep the click events cellData in this queue
  // and trigger another event only after the current loading is done.
  // The queue is necessary since a click in the overall swimlane triggers
  // an update of the viewby swimlanes. If we'd just ignored click events
  // during the loading, we could miss programmatically triggered events like
  // those coming via AppState when a selection is part of the URL.
  const swimlaneCellClickListenerQueue = [];

  // Listener for click events in the swimlane to load corresponding anomaly data.
  const swimlaneCellClickListener = function (cellData) {
    if (skipCellClicks === true) {
      swimlaneCellClickListenerQueue.push(cellData);
      return;
    }

    // If cellData is an empty object we clear any existing selection,
    // otherwise we save the new selection in AppState and update the Explorer.
    if (_.keys(cellData).length === 0) {
      if ($scope.viewByLoadedForTimeFormatted) {
        // Reload 'view by' swimlane over full time range.
        loadViewBySwimlane([]);
      }
      clearSelectedAnomalies();
    } else {
      $scope.appState.fetch();
      $scope.appState.mlExplorerSwimlane.selectedType = cellData.type;
      $scope.appState.mlExplorerSwimlane.selectedLanes = cellData.lanes;
      $scope.appState.mlExplorerSwimlane.selectedTimes = cellData.times;
      $scope.appState.save();
      $scope.cellData = cellData;
      updateExplorer();
    }
  };
  mlExplorerDashboardService.swimlaneCellClick.watch(swimlaneCellClickListener);

  const checkboxShowChartsListener = function () {
    const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
    if (showCharts && $scope.cellData !== undefined) {
      updateExplorer();
    } else {
      const timerange = getSelectionTimeRange($scope.cellData);
      mlExplorerDashboardService.anomalyDataChange.changed(
        [], timerange.earliestMs, timerange.latestMs
      );
    }
  };
  mlCheckboxShowChartsService.state.watch(checkboxShowChartsListener);

  const anomalyChartsSeverityListener = function () {
    const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
    if (showCharts && $scope.cellData !== undefined) {
      const timerange = getSelectionTimeRange($scope.cellData);
      mlExplorerDashboardService.anomalyDataChange.changed(
        $scope.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
      );
    }
  };
  mlSelectSeverityService.state.watch(anomalyChartsSeverityListener);

  const tableControlsListener = function () {
    loadAnomaliesTableData();
  };
  mlSelectIntervalService.state.watch(tableControlsListener);
  mlSelectSeverityService.state.watch(tableControlsListener);

  const swimlaneLimitListener = function () {
    loadViewBySwimlane([]);
    clearSelectedAnomalies();
  };
  mlSelectLimitService.state.watch(swimlaneLimitListener);

  // Listens to render updates of the swimlanes to update dragSelect
  const swimlaneRenderDoneListener = function () {
    dragSelect.clearSelection();
    dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
  };
  mlExplorerDashboardService.swimlaneRenderDone.watch(swimlaneRenderDoneListener);

  $scope.$on('$destroy', () => {
    dragSelect.stop();
    mlCheckboxShowChartsService.state.unwatch(checkboxShowChartsListener);
    mlExplorerDashboardService.swimlaneCellClick.unwatch(swimlaneCellClickListener);
    mlExplorerDashboardService.swimlaneRenderDone.unwatch(swimlaneRenderDoneListener);
    mlSelectSeverityService.state.unwatch(anomalyChartsSeverityListener);
    mlSelectIntervalService.state.unwatch(tableControlsListener);
    mlSelectSeverityService.state.unwatch(tableControlsListener);
    mlSelectLimitService.state.unwatch(swimlaneLimitListener);
    mlExplorerDashboardService.chartsInitDone.unwatch(initializeAfterChartsContainerDone);
    delete $scope.cellData;
    refreshWatcher.cancel();
    $(window).off('resize', jqueryRedrawOnResize);
    // Cancel listening for updates to the global nav state.
    navListener();
  });

  // track the request to be able to ignore out of date requests
  // and avoid race conditions ending up with the wrong charts.
  let requestCount = 0;
  function loadDataForCharts(jobIds, earliestMs, latestMs, influencers = []) {
    // Just skip doing the request when this function
    // is called without the minimum required data.
    if ($scope.cellData === undefined && influencers.length === 0) {
      return;
    }

    const newRequestCount = ++requestCount;
    requestCount = newRequestCount;

    // Load the top anomalies (by record_score) which will be displayed in the charts.
    mlResultsService.getRecordsForInfluencer(
      jobIds, influencers, 0, earliestMs, latestMs, 500
    )
      .then((resp) => {
        // Ignore this response if it's returned by an out of date promise
        if (newRequestCount < requestCount) {
          return;
        }

        if ($scope.cellData !== undefined && _.keys($scope.cellData).length > 0) {
          $scope.anomalyChartRecords = resp.records;
          console.log('Explorer anomaly charts data set:', $scope.anomalyChartRecords);

          if (mlCheckboxShowChartsService.state.get('showCharts')) {
            mlExplorerDashboardService.anomalyDataChange.changed(
              $scope.anomalyChartRecords, earliestMs, latestMs
            );
          }
        }

        // While the charts were loaded, other events could reset cellData,
        // so check if it's still present. This can happen if a cell selection
        // gets restored from URL/AppState and we find out it's not applicable
        // to the view by swimlanes currently on display.
        if ($scope.cellData === undefined) {
          return;
        }

        if (influencers.length > 0) {
          // Filter the Top Influencers list to show just the influencers from
          // the records in the selected time range.
          const recordInfluencersByName = {};

          // Add the specified influencer(s) to ensure they are used in the filter
          // even if their influencer score for the selected time range is zero.
          influencers.forEach((influencer) => {
            const fieldName = influencer.fieldName;
            if (recordInfluencersByName[influencer.fieldName] === undefined) {
              recordInfluencersByName[influencer.fieldName] = [];
            }
            recordInfluencersByName[fieldName].push(influencer.fieldValue);
          });

          // Add the influencers from the top scoring anomalies.
          resp.records.forEach((record) => {
            const influencersByName = record.influencers || [];
            influencersByName.forEach((influencer) => {
              const fieldName = influencer.influencer_field_name;
              const fieldValues = influencer.influencer_field_values;
              if (recordInfluencersByName[fieldName] === undefined) {
                recordInfluencersByName[fieldName] = [];
              }
              recordInfluencersByName[fieldName].push(...fieldValues);
            });
          });

          const uniqValuesByName = {};
          Object.keys(recordInfluencersByName).forEach((fieldName) => {
            const fieldValues = recordInfluencersByName[fieldName];
            uniqValuesByName[fieldName] = _.uniq(fieldValues);
          });

          const filterInfluencers = [];
          Object.keys(uniqValuesByName).forEach((fieldName) => {
            // Find record influencers with the same field name as the clicked on cell(s).
            const matchingFieldName = influencers.find((influencer) => {
              return influencer.fieldName === fieldName;
            });

            if (matchingFieldName !== undefined) {
              // Filter for the value(s) of the clicked on cell(s).
              filterInfluencers.push(...influencers);
            } else {
              // For other field names, add values from all records.
              uniqValuesByName[fieldName].forEach((fieldValue) => {
                filterInfluencers.push({ fieldName, fieldValue });
              });
            }
          });

          loadTopInfluencers(jobIds, earliestMs, latestMs, filterInfluencers);
        }
      });
  }

  function loadViewBySwimlaneOptions() {
    // Obtain the list of 'View by' fields per job.
    $scope.swimlaneViewByFieldName = null;
    let viewByOptions = [];   // Unique influencers for the selected job(s).

    const selectedJobIds = $scope.getSelectedJobIds();
    const fieldsByJob = { '*': [] };
    _.each(mlJobService.jobs, (job) => {
      // Add the list of distinct by, over, partition and influencer fields for each job.
      let fieldsForJob = [];

      const analysisConfig = job.analysis_config;
      const detectors = analysisConfig.detectors || [];
      _.each(detectors, (detector) => {
        if (_.has(detector, 'partition_field_name')) {
          fieldsForJob.push(detector.partition_field_name);
        }
        if (_.has(detector, 'over_field_name')) {
          fieldsForJob.push(detector.over_field_name);
        }
        // For jobs with by and over fields, don't add the 'by' field as this
        // field will only be added to the top-level fields for record type results
        // if it also an influencer over the bucket.
        if (_.has(detector, 'by_field_name') && !(_.has(detector, 'over_field_name'))) {
          fieldsForJob.push(detector.by_field_name);
        }
      });

      const influencers = analysisConfig.influencers || [];
      fieldsForJob = fieldsForJob.concat(influencers);
      if (selectedJobIds.indexOf(job.job_id) !== -1) {
        viewByOptions = viewByOptions.concat(influencers);
      }

      fieldsByJob[job.job_id] = _.uniq(fieldsForJob);
      fieldsByJob['*'] = _.union(fieldsByJob['*'], fieldsByJob[job.job_id]);
    });

    $scope.fieldsByJob = fieldsByJob;   // Currently unused but may be used if add in view by detector.
    viewByOptions = _.chain(viewByOptions).uniq().sortBy(fieldName => fieldName.toLowerCase()).value();
    viewByOptions.push(VIEW_BY_JOB_LABEL);
    $scope.viewBySwimlaneOptions = viewByOptions;

    if ($scope.appState.mlExplorerSwimlane.viewBy !== undefined &&
      $scope.viewBySwimlaneOptions.indexOf($scope.appState.mlExplorerSwimlane.viewBy) !== -1) {
      // Set the swimlane viewBy to that stored in the state (URL) if set.
      $scope.swimlaneViewByFieldName = $scope.appState.mlExplorerSwimlane.viewBy;
    } else {
      if (selectedJobIds.length > 1) {
        // If more than one job selected, default to job ID.
        $scope.swimlaneViewByFieldName = VIEW_BY_JOB_LABEL;
      } else {
        // For a single job, default to the first partition, over,
        // by or influencer field of the first selected job.
        const firstSelectedJob = _.find(mlJobService.jobs, (job) => {
          return job.job_id === selectedJobIds[0];
        });

        const firstJobInfluencers = firstSelectedJob.analysis_config.influencers || [];
        _.each(firstSelectedJob.analysis_config.detectors, (detector) => {

          if (_.has(detector, 'partition_field_name') &&
              firstJobInfluencers.indexOf(detector.partition_field_name) !== -1) {
            $scope.swimlaneViewByFieldName = detector.partition_field_name;
            return false;
          }

          if (_.has(detector, 'over_field_name') &&
              firstJobInfluencers.indexOf(detector.over_field_name) !== -1) {
            $scope.swimlaneViewByFieldName = detector.over_field_name;
            return false;
          }

          // For jobs with by and over fields, don't add the 'by' field as this
          // field will only be added to the top-level fields for record type results
          // if it also an influencer over the bucket.
          if (_.has(detector, 'by_field_name') && !(_.has(detector, 'over_field_name')) &&
              firstJobInfluencers.indexOf(detector.by_field_name) !== -1) {
            $scope.swimlaneViewByFieldName = detector.by_field_name;
            return false;
          }
        });

        if ($scope.swimlaneViewByFieldName === null) {
          if (firstJobInfluencers.length > 0) {
            $scope.swimlaneViewByFieldName = firstJobInfluencers[0];
          } else {
            // No influencers for first selected job - set to first available option.
            $scope.swimlaneViewByFieldName = $scope.viewBySwimlaneOptions.length > 0 ? $scope.viewBySwimlaneOptions[0] : null;
          }
        }

      }

      $scope.appState.fetch();
      $scope.appState.mlExplorerSwimlane.viewBy = $scope.swimlaneViewByFieldName;
      $scope.appState.save();
    }

    loadViewBySwimlane([]);

  }

  function loadOverallData() {
    // Loads the overall data components i.e. the overall swimlane and influencers list.

    if ($scope.selectedJobs === null) {
      return;
    }

    $scope.loading = true;
    $scope.hasResults = false;

    $scope.swimlaneBucketInterval = calculateSwimlaneBucketInterval();
    console.log('Explorer swimlane bucketInterval:', $scope.swimlaneBucketInterval);

    // Ensure the search bounds align to the bucketing interval used in the swimlane so
    // that the first and last buckets are complete.
    const bounds = timefilter.getActiveBounds();
    const searchBounds = getBoundsRoundedToInterval(bounds, $scope.swimlaneBucketInterval, false);
    const selectedJobIds = $scope.getSelectedJobIds();

    // Load the overall bucket scores by time.
    // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
    // which wouldn't be the case if e.g. '1M' was used.
    // Pass 'true' when obtaining bucket bounds due to the way the overall_buckets endpoint works
    // to ensure the search is inclusive of end time.
    const overallBucketsBounds = getBoundsRoundedToInterval(bounds, $scope.swimlaneBucketInterval, true);
    mlResultsService.getOverallBucketScores(
      selectedJobIds,
      // Note there is an optimization for when top_n == 1.
      // If top_n > 1, we should test what happens when the request takes long
      // and refactor the loading calls, if necessary, to avoid delays in loading other components.
      1,
      overallBucketsBounds.min.valueOf(),
      overallBucketsBounds.max.valueOf(),
      $scope.swimlaneBucketInterval.asSeconds() + 's'
    ).then((resp) => {
      skipCellClicks = false;
      $scope.overallSwimlaneData = processOverallResults(resp.results, searchBounds);
      console.log('Explorer overall swimlane data set:', $scope.overallSwimlaneData);

      if ($scope.overallSwimlaneData.points && $scope.overallSwimlaneData.points.length > 0) {
        $scope.hasResults = true;

        // Trigger loading of the 'view by' swimlane -
        // only load once the overall swimlane so that we can match the time span.
        loadViewBySwimlaneOptions();
      } else {
        $scope.hasResults = false;
      }
      $scope.loading = false;

      // Tell the result components directives to render.
      // Need to use $timeout to ensure the broadcast happens after the child scope is updated with the new data.
      $timeout(() => {
        $scope.$broadcast('render');
        mlExplorerDashboardService.swimlaneDataChange.changed(mapScopeToSwimlaneProps(SWIMLANE_TYPE.OVERALL));
      }, 0);
    });

  }

  function loadTopInfluencers(selectedJobIds, earliestMs, latestMs, influencers = []) {
    if ($scope.noInfluencersConfigured !== true) {
      mlResultsService.getTopInfluencers(
        selectedJobIds,
        earliestMs,
        latestMs,
        MAX_INFLUENCER_FIELD_VALUES,
        influencers
      ).then((resp) => {
        // TODO - sort the influencers keys so that the partition field(s) are first.
        $scope.influencers = resp.influencers;
        console.log('Explorer top influencers data set:', $scope.influencers);
      });
    } else {
      $scope.influencers = {};
    }
  }

  function loadViewBySwimlane(fieldValues) {
    // reset the swimlane data to avoid flickering where the old dataset would briefly show up.
    $scope.viewBySwimlaneData = getDefaultViewBySwimlaneData();

    skipCellClicks = true;
    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish(resp) {
      if (resp !== undefined) {
        $scope.viewBySwimlaneData = processViewByResults(resp.results, fieldValues);

        // do a sanity check against cellData. It can happen that a previously
        // selected lane loaded via URL/AppState is not available anymore.
        if (
          $scope.cellData !== undefined &&
          $scope.cellData.type === SWIMLANE_TYPE.VIEW_BY
        ) {
          const selectionExists = $scope.cellData.lanes.some((lane) => {
            return ($scope.viewBySwimlaneData.laneLabels.includes(lane));
          });
          if (selectionExists === false) {
            clearSelectedAnomalies();
          }
        }
      }

      skipCellClicks = false;
      console.log('Explorer view by swimlane data set:', $scope.viewBySwimlaneData);
      if (swimlaneCellClickListenerQueue.length > 0) {
        const cellData = swimlaneCellClickListenerQueue.pop();
        swimlaneCellClickListenerQueue.length = 0;
        swimlaneCellClickListener(cellData);
        return;
      }
      // Fire event to indicate swimlane data has changed.
      // Need to use $timeout to ensure this happens after the child scope is updated with the new data.
      $timeout(() => {
        mlExplorerDashboardService.swimlaneDataChange.changed(mapScopeToSwimlaneProps(SWIMLANE_TYPE.VIEW_BY));
      }, 0);
    }

    if (
      $scope.selectedJobs === undefined ||
      $scope.swimlaneViewByFieldName === undefined  ||
      $scope.swimlaneViewByFieldName === null
    ) {
      finish();
      return;
    } else {
      // Ensure the search bounds align to the bucketing interval used in the swimlane so
      // that the first and last buckets are complete.
      const bounds = timefilter.getActiveBounds();
      const searchBounds = getBoundsRoundedToInterval(bounds, $scope.swimlaneBucketInterval, false);
      const selectedJobIds = $scope.getSelectedJobIds();
      const limit = mlSelectLimitService.state.get('limit');
      const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

      // load scores by influencer/jobId value and time.
      // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
      // which wouldn't be the case if e.g. '1M' was used.
      const interval = $scope.swimlaneBucketInterval.asSeconds() + 's';
      if ($scope.swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
        mlResultsService.getInfluencerValueMaxScoreByTime(
          selectedJobIds,
          $scope.swimlaneViewByFieldName,
          fieldValues,
          searchBounds.min.valueOf(),
          searchBounds.max.valueOf(),
          interval,
          swimlaneLimit
        ).then(finish);
      } else {
        const jobIds = (fieldValues !== undefined && fieldValues.length > 0) ? fieldValues : selectedJobIds;
        mlResultsService.getScoresByBucket(
          jobIds,
          searchBounds.min.valueOf(),
          searchBounds.max.valueOf(),
          interval,
          swimlaneLimit
        ).then(finish);
      }
    }
  }

  function loadViewBySwimlaneForSelectedTime(earliestMs, latestMs) {
    const selectedJobIds = $scope.getSelectedJobIds();
    const limit = mlSelectLimitService.state.get('limit');
    const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

    // Find the top field values for the selected time, and then load the 'view by'
    // swimlane over the full time range for those specific field values.
    if ($scope.swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
      mlResultsService.getTopInfluencers(
        selectedJobIds,
        earliestMs,
        latestMs,
        swimlaneLimit
      ).then((resp) => {
        const topFieldValues = [];
        const topInfluencers = resp.influencers[$scope.swimlaneViewByFieldName];
        _.each(topInfluencers, (influencerData) => {
          if (influencerData.maxAnomalyScore > 0) {
            topFieldValues.push(influencerData.influencerFieldValue);
          }
        });
        loadViewBySwimlane(topFieldValues);
      });
    } else {
      mlResultsService.getScoresByBucket(
        selectedJobIds,
        earliestMs,
        latestMs,
        $scope.swimlaneBucketInterval.asSeconds() + 's',
        swimlaneLimit
      ).then((resp) => {
        loadViewBySwimlane(_.keys(resp.results));
      });
    }
  }

  function loadAnomaliesTableData() {
    const cellData = $scope.cellData;
    const jobIds = ($scope.cellData !== undefined && cellData.fieldName === VIEW_BY_JOB_LABEL) ?
      cellData.lanes : $scope.getSelectedJobIds();
    const influencers = getSelectionInfluencers(cellData);
    const timeRange = getSelectionTimeRange(cellData);

    ml.results.getAnomaliesTableData(
      jobIds,
      [],
      influencers,
      mlSelectIntervalService.state.get('interval').val,
      mlSelectSeverityService.state.get('threshold').val,
      timeRange.earliestMs,
      timeRange.latestMs,
      dateFormatTz,
      500,
      MAX_CATEGORY_EXAMPLES
    ).then((resp) => {
      const anomalies = resp.anomalies;
      const detectorsByJob = mlJobService.detectorsByJob;
      anomalies.forEach((anomaly) => {
        // Add a detector property to each anomaly.
        // Default to functionDescription if no description available.
        // TODO - when job_service is moved server_side, move this to server endpoint.
        const jobId = anomaly.jobId;
        const detector = _.get(detectorsByJob, [jobId, anomaly.detectorIndex]);
        anomaly.detector = _.get(detector,
          ['detector_description'],
          anomaly.source.function_description);

        // For detectors with rules, add a property with the rule count.
        if (detector !== undefined && detector.custom_rules !== undefined) {
          anomaly.rulesLength = detector.custom_rules.length;
        }

        // Add properties used for building the links menu.
        // TODO - when job_service is moved server_side, move this to server endpoint.
        anomaly.isTimeSeriesViewDetector = isTimeSeriesViewDetector(
          mlJobService.getJob(jobId), anomaly.detectorIndex);
        if (_.has(mlJobService.customUrlsByJob, jobId)) {
          anomaly.customUrls = mlJobService.customUrlsByJob[jobId];
        }
      });

      $scope.$evalAsync(() => {
        $scope.tableData = {
          anomalies,
          interval: resp.interval,
          examplesByJobId: resp.examplesByJobId,
          showViewSeriesLink: true
        };
      });

    }).catch((resp) => {
      console.log('Explorer - error loading data for anomalies table:', resp);
    });
  }

  function updateExplorer() {
    const cellData = $scope.cellData;

    const jobIds = (cellData !== undefined && cellData.fieldName === VIEW_BY_JOB_LABEL) ? cellData.lanes : $scope.getSelectedJobIds();
    const timerange = getSelectionTimeRange(cellData);
    const influencers = getSelectionInfluencers(cellData);

    // The following is to avoid running into a race condition where loading a swimlane selection from URL/AppState
    // would fail because the Explorer Charts Container's directive wasn't linked yet and not being subscribed
    // to the anomalyDataChange listener used in loadDataForCharts().
    function finish() {
      if ($scope.overallSwimlaneData !== undefined) {
        mlExplorerDashboardService.swimlaneDataChange.changed(mapScopeToSwimlaneProps(SWIMLANE_TYPE.OVERALL));
      }
      if ($scope.viewBySwimlaneData !== undefined) {
        mlExplorerDashboardService.swimlaneDataChange.changed(mapScopeToSwimlaneProps(SWIMLANE_TYPE.VIEW_BY));
      }
      mlExplorerDashboardService.anomalyDataChange.changed($scope.anomalyChartRecords || [], timerange.earliestMs, timerange.latestMs);

      if (cellData !== undefined && cellData.fieldName === undefined) {
        // Click is in one of the cells in the Overall swimlane - reload the 'view by' swimlane
        // to show the top 'view by' values for the selected time.
        loadViewBySwimlaneForSelectedTime(timerange.earliestMs, timerange.latestMs);
        $scope.viewByLoadedForTimeFormatted = moment(timerange.earliestMs).format('MMMM Do YYYY, HH:mm');
      }

      if (influencers.length === 0) {
        loadTopInfluencers(jobIds, timerange.earliestMs, timerange.latestMs);
        loadDataForCharts(jobIds, timerange.earliestMs, timerange.latestMs);
      } else {
        loadDataForCharts(jobIds, timerange.earliestMs, timerange.latestMs, influencers);
      }
      loadAnomaliesTableData();
    }

    if (isChartsContainerInitialized) {
      finish();
    } else {
      chartsCallback = finish;
    }
  }

  function clearSelectedAnomalies() {
    $scope.anomalyChartRecords = [];
    $scope.viewByLoadedForTimeFormatted = null;
    delete $scope.cellData;
    clearSwimlaneSelectionFromAppState();
    updateExplorer();
  }

  function calculateSwimlaneBucketInterval() {
    // Bucketing interval should be the maximum of the chart related interval (i.e. time range related)
    // and the max bucket span for the jobs shown in the chart.
    const bounds = timefilter.getActiveBounds();
    const buckets = new TimeBuckets();
    buckets.setInterval('auto');
    buckets.setBounds(bounds);

    const intervalSeconds = buckets.getInterval().asSeconds();

    // if the swimlane cell widths are too small they will not be visible
    // calculate how many buckets will be drawn before the swimlanes are actually rendered
    // and increase the interval to widen the cells if they're going to be smaller than 8px
    // this has to be done at this stage so all searches use the same interval
    const numBuckets = parseInt(((bounds.max.valueOf() - bounds.min.valueOf()) / 1000) / intervalSeconds);
    const swimlaneWidth = getSwimlaneContainerWidth();
    const cellWidth = Math.floor(swimlaneWidth / numBuckets);
    $scope.swimlaneWidth = swimlaneWidth;

    // if the cell width is going to be less than 8px, double the interval
    if (cellWidth < 8) {
      buckets.setInterval((intervalSeconds * 2) + 's');
    }

    const selectedJobs = _.filter($scope.jobs, job => job.selected);
    const maxBucketSpanSeconds = _.reduce(selectedJobs, (memo, job) => Math.max(memo, job.bucketSpanSeconds), 0);
    if (maxBucketSpanSeconds > intervalSeconds) {
      buckets.setInterval(maxBucketSpanSeconds + 's');
      buckets.setBounds(bounds);
    }

    return buckets.getInterval();
  }

  function getSwimlaneContainerWidth() {
    if ($scope.noInfluencersConfigured === true) {
      // swimlane is full width, minus 30 for the 'no influencers' info icon,
      // minus 170 for the lane labels, minus 50 padding
      return $mlExplorer.width() - 250;
    } else {
      // swimlane width is 5 sixths of the window,
      // minus 170 for the lane labels, minus 50 padding
      return (($mlExplorer.width() / 6) * 5) - 220;
    }
  }

  function processOverallResults(scoresByTime, searchBounds) {
    const dataset = {
      laneLabels: ['Overall'],
      points: [],
      interval: $scope.swimlaneBucketInterval.asSeconds(),
      earliest: searchBounds.min.valueOf() / 1000,
      latest: searchBounds.max.valueOf() / 1000
    };

    if (_.keys(scoresByTime).length > 0) {
      // Store the earliest and latest times of the data returned by the ES aggregations,
      // These will be used for calculating the earliest and latest times for the swimlane charts.
      _.each(scoresByTime, (score, timeMs) => {
        const time = timeMs / 1000;
        dataset.points.push({
          laneLabel: 'Overall',
          time,
          value: score
        });

        dataset.earliest = Math.min(time, dataset.earliest);
        dataset.latest = Math.max((time + dataset.interval), dataset.latest);
      });
    }

    return dataset;
  }

  function processViewByResults(scoresByInfluencerAndTime, sortedLaneValues) {
    // Processes the scores for the 'view by' swimlane.
    // Sorts the lanes according to the supplied array of lane
    // values in the order in which they should be displayed,
    // or pass an empty array to sort lanes according to max score over all time.
    const dataset = {
      fieldName: $scope.swimlaneViewByFieldName,
      points: [],
      interval: $scope.swimlaneBucketInterval.asSeconds()
    };

    // Set the earliest and latest to be the same as the overall swimlane.
    dataset.earliest = $scope.overallSwimlaneData.earliest;
    dataset.latest = $scope.overallSwimlaneData.latest;

    const laneLabels = [];
    const maxScoreByLaneLabel = {};

    _.each(scoresByInfluencerAndTime, (influencerData, influencerFieldValue) => {
      laneLabels.push(influencerFieldValue);
      maxScoreByLaneLabel[influencerFieldValue] = 0;

      _.each(influencerData, (anomalyScore, timeMs) => {
        const time = timeMs / 1000;
        dataset.points.push({
          laneLabel: influencerFieldValue,
          time,
          value: anomalyScore
        });
        maxScoreByLaneLabel[influencerFieldValue] =
          Math.max(maxScoreByLaneLabel[influencerFieldValue], anomalyScore);
      });
    });

    const sortValuesLength = sortedLaneValues.length;
    if (sortValuesLength === 0) {
      // Sort lanes in descending order of max score.
      // Note the keys in scoresByInfluencerAndTime received from the ES request
      // are not guaranteed to be sorted by score if they can be parsed as numbers
      // (e.g. if viewing by HTTP response code).
      dataset.laneLabels = laneLabels.sort((a, b) => {
        return maxScoreByLaneLabel[b] - maxScoreByLaneLabel[a];
      });
    } else {
      // Sort lanes according to supplied order
      // e.g. when a cell in the overall swimlane has been selected.
      // Find the index of each lane label from the actual data set,
      // rather than using sortedLaneValues as-is, just in case they differ.
      dataset.laneLabels = laneLabels.sort((a, b) => {
        let aIndex = sortedLaneValues.indexOf(a);
        let bIndex = sortedLaneValues.indexOf(b);
        aIndex = (aIndex > -1) ? aIndex : sortValuesLength;
        bIndex = (bIndex > -1) ? bIndex : sortValuesLength;
        return aIndex - bIndex;
      });
    }

    return dataset;
  }

});
