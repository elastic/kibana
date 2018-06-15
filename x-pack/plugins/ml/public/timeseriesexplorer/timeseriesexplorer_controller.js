/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Angular controller for the Machine Learning Single Metric Viewer dashboard, which
 * allows the user to explore a single time series. The controller makes multiple queries
 * to Elasticsearch to obtain the data to populate all the components in the view.
 */

import _ from 'lodash';
import moment from 'moment';

import 'plugins/ml/components/anomalies_table';
import 'plugins/ml/services/field_format_service';
import 'plugins/ml/services/forecast_service';
import 'plugins/ml/services/job_service';
import 'plugins/ml/services/results_service';

import { notify } from 'ui/notify';
import uiRoutes from 'ui/routes';
import 'ui/timefilter';
import { parseInterval } from 'ui/utils/parse_interval';
import { checkLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, permissionCheckProvider } from 'plugins/ml/privilege/check_privilege';
import {
  isJobVersionGte,
  isTimeSeriesViewJob,
  isTimeSeriesViewDetector,
  isModelPlotEnabled,
  mlFunctionToESAggregation } from 'plugins/ml/../common/util/job_utils';
import { getIndexPatterns } from 'plugins/ml/util/index_utils';
import {
  createTimeSeriesJobData,
  processForecastResults,
  processDataForFocusAnomalies,
  processMetricPlotResults,
  processRecordScoreResults,
  processScheduledEventsForChart } from 'plugins/ml/timeseriesexplorer/timeseriesexplorer_utils';
import { refreshIntervalWatcher } from 'plugins/ml/util/refresh_interval_watcher';
import { IntervalHelperProvider, getBoundsRoundedToInterval } from 'plugins/ml/util/ml_time_buckets';
import template from './timeseriesexplorer.html';
import forecastingModalTemplate from 'plugins/ml/timeseriesexplorer/forecasting_modal/forecasting_modal.html';
import { getMlNodeCount, mlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';

uiRoutes
  .when('/timeseriesexplorer/?', {
    template,
    resolve: {
      CheckLicense: checkLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: getIndexPatterns,
      mlNodeCount: getMlNodeCount
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlTimeSeriesExplorerController', function (
  $scope,
  $route,
  $timeout,
  $compile,
  $modal,
  Private,
  $q,
  es,
  timefilter,
  AppState,
  mlJobService,
  mlResultsService,
  mlJobSelectService,
  mlTimeSeriesSearchService,
  mlForecastService,
  mlAnomaliesTableService,
  mlFieldFormatService) {

  $scope.timeFieldName = 'timestamp';
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  const FORECAST_JOB_MIN_VERSION = '6.1.0'; // Forecasting only allowed for jobs created >= 6.1.0.
  const CHARTS_POINT_TARGET = 500;
  const ANOMALIES_MAX_RESULTS = 500;
  const MAX_SCHEDULED_EVENTS = 10;          // Max number of scheduled events displayed per bucket.
  const TimeBuckets = Private(IntervalHelperProvider);

  $scope.jobPickerSelections = [];
  $scope.selectedJob;
  $scope.detectors = [];
  $scope.loading = true;
  $scope.loadCounter = 0;
  $scope.hasResults = false;
  $scope.anomalyRecords = [];

  $scope.modelPlotEnabled = false;
  $scope.forecastingDisabled = false;
  $scope.forecastingDisabledMessage = '';
  $scope.showModelBounds = true;            // Toggles display of model bounds in the focus chart
  $scope.showModelBoundsCheckbox = false;
  $scope.showForecast = true;               // Toggles display of forecast data in the focus chart
  $scope.showForecastCheckbox = false;

  const { checkPermission, createPermissionFailureMessage } = Private(permissionCheckProvider);
  $scope.permissions = {
    canForecastJob: checkPermission('canForecastJob')
  };
  $scope.createPermissionFailureMessage = createPermissionFailureMessage;


  $scope.initializeVis = function () {
    // Initialize the AppState in which to store the zoom range.
    const stateDefaults = {
      mlTimeSeriesExplorer: {}
    };
    $scope.appState = new AppState(stateDefaults);

    $scope.jobs = [];

    // Load the job info needed by the visualization, then do the first load.
    mlJobService.loadJobs()
      .then((resp) => {

        if (resp.jobs.length > 0) {
          $scope.jobs = createTimeSeriesJobData(resp.jobs);
          const timeSeriesJobIds = $scope.jobs.map(j => j.id);

          // Select any jobs set in the global state (i.e. passed in the URL).
          let selectedJobIds = mlJobSelectService.getSelectedJobIds(true);

          // Check if any of the jobs set in the URL are not time series jobs
          // (e.g. if switching to this view straight from the Anomaly Explorer).
          const invalidIds = _.difference(selectedJobIds, timeSeriesJobIds);
          selectedJobIds = _.without(selectedJobIds, ...invalidIds);
          if (invalidIds.length > 0) {
            const s = invalidIds.length === 1 ? '' : 's';
            let warningText = `Requested job${s} ${invalidIds} cannot be viewed in this dashboard`;
            if (selectedJobIds.length === 0 && timeSeriesJobIds.length > 0) {
              warningText += ', auto selecting first job';
            }
            notify.warning(warningText, { lifetime: 30000 });
          }

          if (selectedJobIds.length > 1 || mlJobSelectService.groupIds.length) {
          // if more than one job or a group has been loaded from the URL
            if (selectedJobIds.length > 1) {
            // if more than one job, select the first job from the selection.
              notify.warning('Only one job may be viewed at a time in this dashboard', { lifetime: 30000 });
              mlJobSelectService.setJobIds([selectedJobIds[0]]);
            } else {
            // if a group has been loaded
              if (selectedJobIds.length > 0) {
              // if the group contains valid jobs, select the first
                notify.warning('Only one job may be viewed at a time in this dashboard', { lifetime: 30000 });
                mlJobSelectService.setJobIds([selectedJobIds[0]]);
              } else if ($scope.jobs.length > 0) {
              // if there are no valid jobs in the group but there are valid jobs
              // in the list of all jobs, select the first
                mlJobSelectService.setJobIds([$scope.jobs[0].id]);
              } else {
              // if there are no valid jobs left.
                $scope.loading = false;
              }
            }
          } else if (invalidIds.length > 0 && selectedJobIds.length > 0) {
          // if some ids have been filtered out because they were invalid.
          // refresh the URL with the first valid id
            mlJobSelectService.setJobIds([selectedJobIds[0]]);
          } else if (selectedJobIds.length > 0) {
          // normal behavior. a job ID has been loaded from the URL
            loadForJobId(selectedJobIds[0]);
          } else {
            if (selectedJobIds.length === 0 && $scope.jobs.length > 0) {
            // no jobs were loaded from the URL, so add the first job
            // from the full jobs list.
              mlJobSelectService.setJobIds([$scope.jobs[0].id]);
            } else {
            // Jobs exist, but no time series jobs.
              $scope.loading = false;
            }
          }
        } else {
          $scope.loading = false;
        }

      }).catch((resp) => {
        console.log('Time series explorer - error getting job info from elasticsearch:', resp);
      });
  };

  $scope.refresh = function () {

    if ($scope.selectedJob === undefined) {
      return;
    }

    $scope.loading = true;
    $scope.hasResults = false;
    delete $scope.chartDetails;
    delete $scope.contextChartData;
    delete $scope.focusChartData;
    delete $scope.contextForecastData;
    delete $scope.focusForecastData;

    // Counter to keep track of what data sets have been loaded.
    $scope.loadCounter++;
    let awaitingCount = 3;

    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish(counterVar) {
      awaitingCount--;
      if (awaitingCount === 0 && (counterVar === $scope.loadCounter)) {

        if (($scope.contextChartData && $scope.contextChartData.length) ||
          ($scope.contextForecastData && $scope.contextForecastData.length)) {
          $scope.hasResults = true;
        } else {
          $scope.hasResults = false;
        }
        $scope.loading = false;

        // Set zoomFrom/zoomTo attributes in scope which will result in the metric chart automatically
        // selecting the specified range in the context chart, and so loading that date range in the focus chart.
        if ($scope.contextChartData.length) {
          const focusRange = calculateInitialFocusRange();
          $scope.zoomFrom = focusRange[0];
          $scope.zoomTo = focusRange[1];
        }

        // Tell the results container directives to render.
        // Need to use $timeout to ensure the broadcast happens after the child scope is updated with the new data.
        if (($scope.contextChartData && $scope.contextChartData.length) ||
          ($scope.contextForecastData && $scope.contextForecastData.length)) {
          $timeout(() => {
            $scope.$broadcast('render');
          }, 0);
        }

      }
    }

    const bounds = timefilter.getActiveBounds();

    const detectorIndex = +$scope.detectorId;
    $scope.modelPlotEnabled = isModelPlotEnabled($scope.selectedJob, detectorIndex, $scope.entities);

    // Only filter on the entity if the field has a value.
    const nonBlankEntities = _.filter($scope.entities, (entity) => { return entity.fieldValue.length > 0; });
    $scope.criteriaFields = [{
      'fieldName': 'detector_index',
      'fieldValue': detectorIndex }
    ].concat(nonBlankEntities);

    // Calculate the aggregation interval for the context chart.
    // Context chart swimlane will display bucket anomaly score at the same interval.
    $scope.contextAggregationInterval = calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, CHARTS_POINT_TARGET);
    console.log('aggregationInterval for context data (s):', $scope.contextAggregationInterval.asSeconds());

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, $scope.contextAggregationInterval, false);

    // Query 1 - load metric data at low granularity across full time range.
    // Pass a counter flag into the finish() function to make sure we only process the results
    // for the most recent call to the load the data in cases where the job selection and time filter
    // have been altered in quick succession (such as from the job picker with 'Apply time range').
    const counter = $scope.loadCounter;
    mlTimeSeriesSearchService.getMetricData(
      $scope.selectedJob,
      detectorIndex,
      nonBlankEntities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.contextAggregationInterval.expression
    ).then((resp) => {
      const fullRangeChartData = processMetricPlotResults(resp.results, $scope.modelPlotEnabled);
      $scope.contextChartData = fullRangeChartData;
      console.log('Time series explorer context chart data set:', $scope.contextChartData);

      finish(counter);
    }).catch((resp) => {
      console.log('Time series explorer - error getting metric data from elasticsearch:', resp);
    });

    // Query 2 - load max record score at same granularity as context chart
    // across full time range for use in the swimlane.
    mlResultsService.getRecordMaxScoreByTime(
      $scope.selectedJob.job_id,
      $scope.criteriaFields,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.contextAggregationInterval.expression
    ).then((resp) => {
      const fullRangeRecordScoreData = processRecordScoreResults(resp.results);
      $scope.swimlaneData = fullRangeRecordScoreData;
      console.log('Time series explorer swimlane anomalies data set:', $scope.swimlaneData);

      finish(counter);
    }).catch((resp) => {
      console.log('Time series explorer - error getting bucket anomaly scores from elasticsearch:', resp);
    });

    // Query 3 - load details on the chart used in the chart title (charting function and entity(s)).
    mlTimeSeriesSearchService.getChartDetails(
      $scope.selectedJob,
      detectorIndex,
      $scope.entities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf()
    ).then((resp) => {
      $scope.chartDetails = resp.results;
      finish(counter);
    }).catch((resp) => {
      console.log('Time series explorer - error getting entity counts from elasticsearch:', resp);
    });

    // Plus query for forecast data if there is a forecastId stored in the appState.
    const forecastId = _.get($scope, 'appState.mlTimeSeriesExplorer.forecastId');
    if (forecastId !== undefined) {
      awaitingCount++;
      let aggType = undefined;
      const detector = $scope.selectedJob.analysis_config.detectors[detectorIndex];
      const esAgg = mlFunctionToESAggregation(detector.function);
      if ($scope.modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
        aggType = { avg: 'sum', max: 'sum', min: 'sum' };
      }
      mlForecastService.getForecastData(
        $scope.selectedJob,
        detectorIndex,
        forecastId,
        nonBlankEntities,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        $scope.contextAggregationInterval.expression,
        aggType)
        .then((resp) => {
          $scope.contextForecastData = processForecastResults(resp.results);
          finish(counter);
        }).catch((resp) => {
          console.log(`Time series explorer - error loading data for forecast ID ${forecastId}`, resp);
        });
    }

    loadEntityValues();
  };

  $scope.refreshFocusData = function (fromDate, toDate) {

    // Counter to keep track of what data sets have been loaded.
    let awaitingCount = 3;

    // This object is used to store the results of individual remote requests
    // before we transform it into the final data and apply it to $scope. Otherwise
    // we might trigger multiple $digest cycles and depending on how deep $watches
    // listen for changes we could miss updates.
    const refreshFocusData = {};

    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish() {
      awaitingCount--;
      if (awaitingCount === 0) {
        // Tell the results container directives to render the focus chart.
        // Need to use $timeout to ensure the broadcast happens after the child scope is updated with the new data.
        refreshFocusData.focusChartData = processDataForFocusAnomalies(
          refreshFocusData.focusChartData,
          refreshFocusData.anomalyRecords,
          $scope.timeFieldName);

        refreshFocusData.focusChartData = processScheduledEventsForChart(
          refreshFocusData.focusChartData,
          refreshFocusData.scheduledEvents);

        // All the data is ready now for a scope update
        $scope.$evalAsync(() => {
          $scope = Object.assign($scope, refreshFocusData);
          console.log('Time series explorer focus chart data set:', $scope.focusChartData);

          $scope.loading = false;
        });
      }
    }

    const detectorIndex = +$scope.detectorId;
    const nonBlankEntities = _.filter($scope.entities, entity => entity.fieldValue.length > 0);

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(fromDate), max: moment(toDate) };
    $scope.focusAggregationInterval = calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, CHARTS_POINT_TARGET);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, $scope.focusAggregationInterval, false);

    // Query 1 - load metric data across selected time range.
    mlTimeSeriesSearchService.getMetricData(
      $scope.selectedJob,
      detectorIndex,
      nonBlankEntities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.focusAggregationInterval.expression
    ).then((resp) => {
      refreshFocusData.focusChartData = processMetricPlotResults(resp.results, $scope.modelPlotEnabled);
      $scope.showModelBoundsCheckbox = ($scope.modelPlotEnabled === true) &&
        (refreshFocusData.focusChartData.length > 0);
      finish();
    }).catch((resp) => {
      console.log('Time series explorer - error getting metric data from elasticsearch:', resp);
    });

    // Query 2 - load records across selected time range.
    mlResultsService.getRecordsForCriteria(
      [$scope.selectedJob.job_id],
      $scope.criteriaFields,
      0,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      ANOMALIES_MAX_RESULTS
    ).then((resp) => {
      // Sort in descending time order before storing in scope.
      refreshFocusData.anomalyRecords = _.chain(resp.records)
        .sortBy(record => record[$scope.timeFieldName])
        .reverse()
        .value();
      console.log('Time series explorer anomalies:', refreshFocusData.anomalyRecords);
      finish();
    });

    // Query 3 - load any scheduled events for the selected job.
    mlResultsService.getScheduledEventsByBucket(
      [$scope.selectedJob.job_id],
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.focusAggregationInterval.expression,
      1,
      MAX_SCHEDULED_EVENTS
    ).then((resp) => {
      refreshFocusData.scheduledEvents = resp.events[$scope.selectedJob.job_id];
      finish();
    }).catch((resp) => {
      console.log('Time series explorer - error getting scheduled events from elasticsearch:', resp);
    });

    // Plus query for forecast data if there is a forecastId stored in the appState.
    const forecastId = _.get($scope, 'appState.mlTimeSeriesExplorer.forecastId');
    if (forecastId !== undefined) {
      awaitingCount++;
      let aggType = undefined;
      const detector = $scope.selectedJob.analysis_config.detectors[detectorIndex];
      const esAgg = mlFunctionToESAggregation(detector.function);
      if ($scope.modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
        aggType = { avg: 'sum', max: 'sum', min: 'sum' };
      }

      mlForecastService.getForecastData(
        $scope.selectedJob,
        detectorIndex,
        forecastId,
        nonBlankEntities,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        $scope.focusAggregationInterval.expression,
        aggType)
        .then((resp) => {
          refreshFocusData.focusForecastData = processForecastResults(resp.results);
          refreshFocusData.showForecastCheckbox = (refreshFocusData.focusForecastData.length > 0);
          finish();
        }).catch((resp) => {
          console.log(`Time series explorer - error loading data for forecast ID ${forecastId}`, resp);
        });
    }

  };

  $scope.saveSeriesPropertiesAndRefresh = function () {
    $scope.appState.mlTimeSeriesExplorer.detectorIndex = +$scope.detectorId;
    $scope.appState.mlTimeSeriesExplorer.entities = {};
    _.each($scope.entities, (entity) => {
      $scope.appState.mlTimeSeriesExplorer.entities[entity.fieldName] = entity.fieldValue;
    });
    $scope.appState.save();

    $scope.refresh();
  };

  $scope.loadForForecastId = function (forecastId) {
    mlForecastService.getForecastDateRange(
      $scope.selectedJob,
      forecastId
    ).then((resp) => {
      const bounds = timefilter.getActiveBounds();
      const earliest = moment(resp.earliest || timefilter.time.from);
      const latest = moment(resp.latest || timefilter.time.to);

      // Store forecast ID in the appState.
      $scope.appState.mlTimeSeriesExplorer.forecastId = forecastId;

      // Set the zoom to show backwards from the end of the forecast range.
      const earliestDataDate = _.first($scope.contextChartData).date;
      const zoomLatestMs = resp.latest;
      const zoomEarliestMs = Math.max(earliestDataDate.getTime(), zoomLatestMs - $scope.autoZoomDuration);
      const zoomState = {
        from: moment(zoomEarliestMs).toISOString(),
        to: moment(zoomLatestMs).toISOString()
      };
      $scope.appState.mlTimeSeriesExplorer.zoom = zoomState;

      $scope.appState.save();

      // Ensure the forecast data will be shown if hidden previously.
      $scope.showForecast = true;

      if (earliest.isBefore(bounds.min) || latest.isAfter(bounds.max)) {
        const earliestMs = Math.min(earliest.valueOf(), bounds.min.valueOf());
        const latestMs = Math.max(latest.valueOf(), bounds.max.valueOf());
        timefilter.time.from = moment(earliestMs).toISOString();
        timefilter.time.to = moment(latestMs).toISOString();
      } else {
        // Refresh to show the requested forecast data.
        $scope.refresh();
      }

    }).catch((resp) => {
      console.log('Time series explorer - error loading time range of forecast from elasticsearch:', resp);
    });
  };

  $scope.openForecastDialog = function () {
    // Allow forecast data to be viewed from the start of the dashboard bounds.
    const bounds = timefilter.getActiveBounds();

    $modal.open({
      template: forecastingModalTemplate,
      controller: 'MlForecastingModal',
      backdrop: 'static',
      size: 'lg',
      keyboard: false,

      resolve: {
        params: () => {
          return {
            pscope: $scope,
            job: $scope.selectedJob,
            entities: $scope.chartDetails.entityData.entities,
            earliest: bounds.min.valueOf(),
            mlNodesAvailable: mlNodesAvailable()
          };
        }
      }
    });
  };

  $scope.detectorIndexChanged = function () {
    updateControlsForDetector();
    loadEntityValues();
  };

  $scope.toggleShowModelBounds = function () {
    $timeout(() => {
      $scope.showModelBounds = !$scope.showModelBounds;
    }, 0);
  };

  $scope.toggleShowForecast = function () {
    $timeout(() => {
      $scope.showForecast = !$scope.showForecast;
    }, 0);
  };

  // Refresh the data when the time range is altered.
  $scope.$listen(timefilter, 'fetch', $scope.refresh);

  // Add a watcher for auto-refresh of the time filter to refresh all the data.
  const refreshWatcher = Private(refreshIntervalWatcher);
  refreshWatcher.init(() => {
    $scope.refresh();
  });

  // Add a listener for filter changes triggered from the anomalies table.
  const filterChangeListener = function (field, value, operator) {
    const entity = _.find($scope.entities, { fieldName: field });
    if (entity !== undefined) {
      if (operator === '+' && entity.fieldValue !== value) {
        entity.fieldValue = value;
        $scope.saveSeriesPropertiesAndRefresh();
      } else if (operator === '-' && entity.fieldValue === value) {
        entity.fieldValue = '';
        $scope.saveSeriesPropertiesAndRefresh();
      }
    }
  };

  mlAnomaliesTableService.filterChange.watch(filterChangeListener);

  $scope.$on('$destroy', () => {
    refreshWatcher.cancel();
    mlAnomaliesTableService.filterChange.unwatch(filterChangeListener);
  });

  // When inside a dashboard in the ML plugin, listen for changes to job selection.
  mlJobSelectService.listenJobSelectionChange($scope, (event, selections) => {
    // Clear the detectorIndex, entities and forecast info.
    if (selections.length > 0) {
      delete $scope.appState.mlTimeSeriesExplorer.detectorIndex;
      delete $scope.appState.mlTimeSeriesExplorer.entities;
      delete $scope.appState.mlTimeSeriesExplorer.forecastId;
      $scope.appState.save();

      $scope.showForecastCheckbox = false;
      loadForJobId(selections[0]);
    }
  });

  $scope.$on('contextChartSelected', function (event, selection) {
    // Save state of zoom (adds to URL) if it is different to the default.
    if (($scope.contextChartData === undefined || $scope.contextChartData.length === 0) &&
      ($scope.contextForecastData === undefined || $scope.contextForecastData.length === 0)) {
      return;
    }

    const defaultRange = calculateDefaultFocusRange();
    if ((selection.from.getTime() !== defaultRange[0].getTime() || selection.to.getTime() !== defaultRange[1].getTime()) &&
      (isNaN(Date.parse(selection.from)) === false && isNaN(Date.parse(selection.to)) === false)) {
      const zoomState = { from: selection.from.toISOString(), to: selection.to.toISOString() };
      $scope.appState.mlTimeSeriesExplorer.zoom = zoomState;
    } else {
      delete $scope.appState.mlTimeSeriesExplorer.zoom;
    }
    $scope.appState.save();

    if ($scope.focusChartData === undefined ||
      ($scope.zoomFrom.getTime() !== selection.from.getTime()) ||
      ($scope.zoomTo.getTime() !== selection.to.getTime())) {
      $scope.refreshFocusData(selection.from, selection.to);
    }

    $scope.zoomFrom = selection.from;
    $scope.zoomTo = selection.to;

  });

  function loadForJobId(jobId) {
    // Validation that the ID is for a time series job must already have been performed.
    // Check if the job was created since the page was first loaded.
    let jobPickerSelectedJob = _.find($scope.jobs, { 'id': jobId });
    if (jobPickerSelectedJob === undefined) {
      const newJobs = [];
      _.each(mlJobService.jobs, (job) => {
        if (isTimeSeriesViewJob(job) === true) {
          const bucketSpan = parseInterval(job.analysis_config.bucket_span);
          newJobs.push({ id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() });
        }
      });
      $scope.jobs = newJobs;
      jobPickerSelectedJob = _.find(newJobs, { 'id': jobId });
    }

    $scope.selectedJob = mlJobService.getJob(jobId);
    $scope.jobPickerSelections = [jobPickerSelectedJob];

    // Read the detector index and entities out of the AppState.
    const jobDetectors = $scope.selectedJob.analysis_config.detectors;
    const viewableDetectors = [];
    _.each(jobDetectors, (dtr, index) => {
      if (isTimeSeriesViewDetector($scope.selectedJob, index)) {
        viewableDetectors.push({ index: '' + index, detector_description: dtr.detector_description });
      }
    });
    $scope.detectors = viewableDetectors;

    // Check the supplied index is valid.
    const appStateDtrIdx = $scope.appState.mlTimeSeriesExplorer.detectorIndex;
    let detectorIndex = appStateDtrIdx !== undefined ? appStateDtrIdx : +(viewableDetectors[0].index);
    if (_.find(viewableDetectors, { 'index': '' + detectorIndex }) === undefined) {
      const warningText = `Requested detector index ${detectorIndex} is not valid for job ${$scope.selectedJob.job_id}`;
      notify.warning(warningText, { lifetime: 30000 });
      detectorIndex = +(viewableDetectors[0].index);
      $scope.appState.mlTimeSeriesExplorer.detectorIndex = detectorIndex;
      $scope.appState.save();
    }

    // Store the detector index as a string so it can be used as ng-model in a select control.
    $scope.detectorId = '' + detectorIndex;

    updateControlsForDetector();

    // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
    mlFieldFormatService.populateFormats([jobId], $route.current.locals.indexPatterns)
      .finally(() => {
        // Load the data - if the FieldFormats failed to populate
        // the default formatting will be used for metric values.
        $scope.refresh();
      });
  }

  function updateControlsForDetector() {
    // Update the entity dropdown control(s) according to the partitioning fields for the selected detector.
    const detectorIndex = +$scope.detectorId;
    const detector = $scope.selectedJob.analysis_config.detectors[detectorIndex];

    const entities = [];
    const entitiesState = $scope.appState.mlTimeSeriesExplorer.entities || {};
    const partitionFieldName = _.get(detector, 'partition_field_name');
    const overFieldName = _.get(detector, 'over_field_name');
    const byFieldName = _.get(detector, 'by_field_name');
    if (partitionFieldName !== undefined) {
      const partitionFieldValue = _.get(entitiesState, partitionFieldName, '');
      entities.push({ fieldName: partitionFieldName, fieldValue: partitionFieldValue });
    }
    if (overFieldName !== undefined) {
      const overFieldValue = _.get(entitiesState, overFieldName, '');
      entities.push({ fieldName: overFieldName, fieldValue: overFieldValue });
    }

    // For jobs with by and over fields, don't add the 'by' field as this
    // field will only be added to the top-level fields for record type results
    // if it also an influencer over the bucket.
    // TODO - metric data can be filtered by this field, so should only exclude
    // from filter for the anomaly records.
    if (byFieldName !== undefined && overFieldName === undefined) {
      const byFieldValue = _.get(entitiesState, byFieldName, '');
      entities.push({ fieldName: byFieldName, fieldValue: byFieldValue });
    }

    $scope.entities = entities;

    // Disable forecasting if the detector has an 'over' field as
    // forecasting is not currently supported for these kinds of models,
    // or if the job was created earlier than 6.1.0.
    if (overFieldName !== undefined) {
      $scope.forecastingDisabled = true;
      $scope.forecastingDisabledMessage = 'Forecasting is not available for population detectors with an over field';
    } else if (isJobVersionGte($scope.selectedJob, FORECAST_JOB_MIN_VERSION) === false) {
      $scope.forecastingDisabled = true;
      $scope.forecastingDisabledMessage = `Forecasting is only available for jobs created in version ${FORECAST_JOB_MIN_VERSION} or later`;
    } else {
      $scope.forecastingDisabled = false;
      $scope.forecastingDisabledMessage = '';
    }
  }

  function loadEntityValues() {
    // Populate the entity input datalists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const bounds = timefilter.getActiveBounds();
    const detectorIndex = +$scope.detectorId;

    mlResultsService.getRecordsForCriteria(
      [$scope.selectedJob.job_id],
      [{ 'fieldName': 'detector_index', 'fieldValue': detectorIndex }],
      0,
      bounds.min.valueOf(),
      bounds.max.valueOf(),
      ANOMALIES_MAX_RESULTS)
      .then((resp) => {
        if (resp.records && resp.records.length > 0) {
          const firstRec = resp.records[0];

          _.each($scope.entities, (entity) => {
            if (firstRec.partition_field_name === entity.fieldName) {
              entity.fieldValues = _.chain(resp.records).pluck('partition_field_value').uniq().value();
            }
            if (firstRec.over_field_name === entity.fieldName) {
              entity.fieldValues = _.chain(resp.records).pluck('over_field_value').uniq().value();
            }
            if (firstRec.by_field_name === entity.fieldName) {
              entity.fieldValues = _.chain(resp.records).pluck('by_field_value').uniq().value();
            }
          });
        }

      });
  }

  function calculateInitialFocusRange() {
    // Check for a zoom parameter in the appState (URL).
    const zoomState = $scope.appState.mlTimeSeriesExplorer.zoom;
    if (zoomState !== undefined) {
      // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
      $scope.autoZoomDuration = getAutoZoomDuration();

      const zoomFrom = moment(zoomState.from, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      const zoomTo = moment(zoomState.to, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);

      // Get the time span of data in the context chart.
      // Valid zoomTo is the time of the last bucket plus the aggregation interval.
      const combinedData = $scope.contextForecastData === undefined ?
        $scope.contextChartData : $scope.contextChartData.concat($scope.contextForecastData);
      const earliestDataDate = _.first(combinedData).date;
      const latestDataDate = new Date(_.last(combinedData).date.valueOf() +
        $scope.contextAggregationInterval.asMilliseconds());

      if (zoomFrom.isValid() && zoomTo.isValid &&
        zoomFrom.isBetween(earliestDataDate, latestDataDate, null, '[]') &&
        zoomTo.isBetween(earliestDataDate, latestDataDate, null, '[]')) {
        return [zoomFrom.toDate(), zoomTo.toDate()];
      }
    }

    return calculateDefaultFocusRange();
  }

  function calculateDefaultFocusRange() {
    // Returns the range that shows the most recent data at bucket span granularity.
    $scope.autoZoomDuration = getAutoZoomDuration();

    const combinedData = $scope.contextForecastData === undefined ?
      $scope.contextChartData : $scope.contextChartData.concat($scope.contextForecastData);

    const earliestDataDate = _.first(combinedData).date;
    const latestDataDate = _.last(combinedData).date;
    const latestMsToLoad = latestDataDate.getTime() + $scope.contextAggregationInterval.asMilliseconds();
    const earliestMsToLoad = Math.max(earliestDataDate.getTime(), latestMsToLoad - $scope.autoZoomDuration);

    return [new Date(earliestMsToLoad), new Date(latestMsToLoad)];
  }

  function calculateAggregationInterval(bounds, bucketsTarget) {
    // Aggregation interval used in queries should be a function of the time span of the chart
    // and the bucket span of the selected job(s).
    const barTarget = (bucketsTarget !== undefined ? bucketsTarget : 100);
    // Use a maxBars of 10% greater than the target.
    const maxBars = Math.floor(1.1 * barTarget);
    const buckets = new TimeBuckets();
    buckets.setInterval('auto');
    buckets.setBounds(bounds);
    buckets.setBarTarget(Math.floor(barTarget));
    buckets.setMaxBars(maxBars);

    // Ensure the aggregation interval is always a multiple of the bucket span to avoid strange
    // behaviour such as adjacent chart buckets holding different numbers of job results.
    const bucketSpanSeconds =  _.find($scope.jobs, { 'id': $scope.selectedJob.job_id }).bucketSpanSeconds;
    let aggInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);

    // Set the interval back to the job bucket span if the auto interval is smaller.
    const secs = aggInterval.asSeconds();
    if (secs < bucketSpanSeconds) {
      buckets.setInterval(bucketSpanSeconds + 's');
      aggInterval = buckets.getInterval();
    }

    console.log('calculateAggregationInterval() barTarget,maxBars,returning:', bucketsTarget, maxBars,
      (bounds.max.diff(bounds.min)) / aggInterval.asMilliseconds());

    return aggInterval;
  }

  function getAutoZoomDuration() {
    // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
    // Get the minimum bucket span of selected jobs.
    // TODO - only look at jobs for which data has been returned?
    const bucketSpanSeconds =  _.find($scope.jobs, { 'id': $scope.selectedJob.job_id }).bucketSpanSeconds;

    // In most cases the duration can be obtained by simply multiplying the points target
    // Check that this duration returns the bucket span when run back through the
    // TimeBucket interval calculation.
    let autoZoomDuration = (bucketSpanSeconds * 1000) * (CHARTS_POINT_TARGET - 1);

    // Use a maxBars of 10% greater than the target.
    const maxBars = Math.floor(1.1 * CHARTS_POINT_TARGET);
    const buckets = new TimeBuckets();
    buckets.setInterval('auto');
    buckets.setBarTarget(Math.floor(CHARTS_POINT_TARGET));
    buckets.setMaxBars(maxBars);

    // Set bounds from 'now' for testing the auto zoom duration.
    const nowMs = new Date().getTime();
    const max = moment(nowMs);
    const min = moment(nowMs - autoZoomDuration);
    buckets.setBounds({ min, max });

    const calculatedInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);
    const calculatedIntervalSecs = calculatedInterval.asSeconds();
    if (calculatedIntervalSecs !== bucketSpanSeconds) {
      // If we haven't got the span back, which may occur depending on the 'auto' ranges
      // used in TimeBuckets and the bucket span of the job, then multiply by the ratio
      // of the bucket span to the calculated interval.
      autoZoomDuration = autoZoomDuration * (bucketSpanSeconds / calculatedIntervalSecs);
    }

    return autoZoomDuration;

  }

  $scope.initializeVis();

});
