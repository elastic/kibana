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

import 'plugins/ml/components/annotations_table';
import 'plugins/ml/components/anomalies_table';
import 'plugins/ml/components/controls';
import 'plugins/ml/components/job_select_list';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import template from './explorer.html';

import uiRoutes from 'ui/routes';
import {
  createJobs,
  getDefaultViewBySwimlaneData,
  getExplorerDefaultProps,
  getFilteredTopInfluencers,
  getSelectedJobIds,
  getSelectedJobs,
  getSelectionInfluencers,
  getSelectionTimeRange,
  getSwimlaneBucketInterval,
  loadAnnotationsTableData,
  loadAnomaliesTableData,
  loadDataForCharts,
  loadTopInfluencers,
  processOverallResults,
  processViewByResults,
  selectedJobsHaveInfluencers,
  mapScopeToProps,
} from './explorer_utils';
import { getAnomalyExplorerBreadcrumbs } from './breadcrumbs';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { loadIndexPatterns } from 'plugins/ml/util/index_utils';
import { refreshIntervalWatcher } from 'plugins/ml/util/refresh_interval_watcher';
import { getBoundsRoundedToInterval } from 'plugins/ml/util/ml_time_buckets';
import { mlExplorerDashboardService } from './explorer_dashboard_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { JobSelectServiceProvider } from 'plugins/ml/components/job_select_list/job_select_service';
import { timefilter } from 'ui/timefilter';
import { formatHumanReadableDateTime } from '../util/date_utils';
import { explorerChartsContainerServiceFactory, getDefaultChartsData } from './explorer_charts/explorer_charts_container_service';
import { getSwimlaneContainerWidth } from './legacy_utils';
import {
  DRAG_SELECT_ACTION,
  SWIMLANE_DEFAULT_LIMIT,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';

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
  mlCheckboxShowChartsService,
  mlSelectLimitService,
  mlSelectIntervalService,
  mlSelectSeverityService) {

  // Initialize the AppState in which to store filters and swimlane settings.
  // AppState is used to store state in the URL.
  const appState = new AppState({
    filters: [],
    mlExplorerSwimlane: {},
  });

  // Props are used by the Explorer React component. mlExplorerReactWrapper listens for changes to these
  // props and passed them on to the React component.
  let props = getExplorerDefaultProps();

  // setProps() is used where we refactor away from "automagic" angularjs $scope updates.
  // setProps() needs to be called explicitly and triggers an event listened to by mlExplorerReactWrapper.
  // Once Anomaly Explorer is full react this won't be necessary anymore, mlExplorerReactWrapper will be removed
  // and prop updates can be triggered directly in this controller.
  function setProps(newProps) {
    props = {
      ...props,
      ...newProps,
      swimlaneWidth: getSwimlaneContainerWidth(props.noInfluencersConfigured),
    };
    mlExplorerDashboardService.explorer.changed(mapScopeToProps(props, $scope, appState));
  }

  // $scope should only contain what's actually still necessary for the angular part.
  // For the moment that's the job selector and the (hidden) filter bar.
  $scope.jobs = [];
  $scope.queryFilters = [];
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

  const queryFilter = Private(FilterBarQueryFilterProvider);
  const mlJobSelectService = Private(JobSelectServiceProvider);

  let resizeTimeout = null;

  let selectedCells;

  const ALLOW_CELL_RANGE_SELECTION = mlExplorerDashboardService.allowCellRangeSelection;
  // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
  let disableDragSelectOnMouseLeave = true;
  // skip listening to clicks on swimlanes while they are loading to avoid race conditions
  let skipCellClicks = true;

  const updateCharts = explorerChartsContainerServiceFactory((data) => {
    setProps({
      chartsData: {
        ...getDefaultChartsData(),
        chartsPerRow: data.chartsPerRow,
        seriesToPlot: data.seriesToPlot,
        // convert truthy/falsy value to Boolean
        tooManyBuckets: !!data.tooManyBuckets,
      }
    });
  });

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

  mlExplorerDashboardService.init();

  // Load the job info needed by the dashboard, then do the first load.
  // Calling loadJobs() ensures the full datafeed config is available for building the charts.
  mlJobService.loadJobs().then(async (resp) => {
    if (resp.jobs.length > 0) {
      $scope.jobs = createJobs(resp.jobs);

      // Select any jobs set in the global state (i.e. passed in the URL).
      const selectedJobIds = mlJobSelectService.getSelectedJobIds(true);
      $scope.jobs = createJobs(mlJobService.jobs);
      const selectedJobs = await getSelectedJobs(props.selectedJobs, $scope.jobs, selectedJobIds, appState);
      setProps({
        noInfluencersConfigured: !selectedJobsHaveInfluencers(selectedJobs),
        selectedJobs
      });

      // Load the data - if the FieldFormats failed to populate
      // the default formatting will be used for metric values.
      await loadOverallData();
      loadViewBySwimlane([]);

      // keep swimlane selection, restore selectedCells from AppState
      if (
        selectedCells === undefined &&
        appState.mlExplorerSwimlane.selectedType !== undefined
      ) {
        selectedCells = {
          type: appState.mlExplorerSwimlane.selectedType,
          lanes: appState.mlExplorerSwimlane.selectedLanes,
          times: appState.mlExplorerSwimlane.selectedTimes
        };
        if (selectedCells.type === SWIMLANE_TYPE.VIEW_BY) {
          selectedCells.fieldName = appState.mlExplorerSwimlane.viewBy;
        }
        setProps({ swimlaneViewByFieldName: appState.mlExplorerSwimlane.viewBy });
      }

      updateExplorer();
    } else {
      setProps({ loading: false });
    }
  }).catch((resp) => {
    console.log('Explorer - error getting job info from elasticsearch:', resp);
  });

  // This queue tracks click events while the swimlanes are loading.
  // To avoid race conditions we keep the click events selectedCells in this queue
  // and trigger another event only after the current loading is done.
  // The queue is necessary since a click in the overall swimlane triggers
  // an update of the viewby swimlanes. If we'd just ignored click events
  // during the loading, we could miss programmatically triggered events like
  // those coming via AppState when a selection is part of the URL.
  const swimlaneCellClickQueue = [];

  // sets callbacks with dependencies on this angularjs controller
  setProps({
    setSwimlaneSelectActive(active) {
      if (!active && disableDragSelectOnMouseLeave) {
        dragSelect.clearSelection();
        dragSelect.stop();
        return;
      }
      dragSelect.start();
    },
    setSwimlaneViewBy(swimlaneViewByFieldName) {
      setProps({ swimlaneViewByFieldName });

      // Save the 'view by' field name to the AppState so that it can restored from the URL.
      appState.fetch();
      appState.mlExplorerSwimlane.viewBy = swimlaneViewByFieldName;
      appState.save();

      loadViewBySwimlane([]);
      clearSelectedAnomalies();
    },
    // Listener for click events in the swimlane to load corresponding anomaly data.
    swimlaneCellClick(swimlaneSelectedCells) {
      if (skipCellClicks === true) {
        swimlaneCellClickQueue.push(swimlaneSelectedCells);
        return;
      }

      // If selectedCells is an empty object we clear any existing selection,
      // otherwise we save the new selection in AppState and update the Explorer.
      if (_.keys(swimlaneSelectedCells).length === 0) {
        if (props.viewByLoadedForTimeFormatted) {
          // Reload 'view by' swimlane over full time range.
          loadViewBySwimlane([]);
        }
        clearSelectedAnomalies();
      } else {
        appState.fetch();
        appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
        appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
        appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
        appState.save();
        selectedCells = swimlaneSelectedCells;
        updateExplorer();
      }
    }
  });

  // Refresh all the data when the time range is altered.
  $scope.$listenAndDigestAsync(timefilter, 'fetch', async () => {
    await loadOverallData();
    loadViewBySwimlane([]);
    clearSelectedAnomalies();
  });

  // Add a watcher for auto-refresh of the time filter to refresh all the data.
  const refreshWatcher = Private(refreshIntervalWatcher);
  refreshWatcher.init(async () => {
    await loadOverallData();
    loadViewBySwimlane([]);
    // TODO - would be better to only clear and reload the selected anomalies
    // if the previous selection was no longer applicable.
    clearSelectedAnomalies();
  });

  // Listen for changes to job selection.
  mlJobSelectService.listenJobSelectionChange($scope, async (event, selections) => {
    clearSwimlaneSelectionFromAppState();
    $scope.jobs = createJobs(mlJobService.jobs);
    const selectedJobs = await getSelectedJobs(props.selectedJobs, $scope.jobs, selections, appState);
    setProps({
      noInfluencersConfigured: !selectedJobsHaveInfluencers(selectedJobs),
      selectedJobs,
    });
    // Load the data - if the FieldFormats failed to populate
    // the default formatting will be used for metric values.
    await loadOverallData();
    loadViewBySwimlane([]);
    clearSelectedAnomalies();
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
    appState.fetch();
    delete appState.mlExplorerSwimlane.selectedType;
    delete appState.mlExplorerSwimlane.selectedLanes;
    delete appState.mlExplorerSwimlane.selectedTimes;
    appState.save();
  }

  function redrawOnResize() {
    setProps({ swimlaneWidth: getSwimlaneContainerWidth(props.noInfluencersConfigured) });

    if (
      mlCheckboxShowChartsService.state.get('showCharts') &&
      props.anomalyChartRecords.length > 0
    ) {
      const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds());
      updateCharts(props.anomalyChartRecords, timerange.earliestMs, timerange.latestMs);
    }
  }

  // Refresh the data when the dashboard filters are updated.
  $scope.$listen(queryFilter, 'update', () => {
    // TODO - add in filtering functionality.
    $scope.queryFilters = queryFilter.getFilters();
    console.log('explorer_controller queryFilter update, filters:', $scope.queryFilters);
  });

  const checkboxShowChartsListener = function () {
    const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
    if (showCharts && selectedCells !== undefined) {
      updateExplorer();
    } else {
      const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds());
      updateCharts(
        [], timerange.earliestMs, timerange.latestMs
      );
    }
  };
  mlCheckboxShowChartsService.state.watch(checkboxShowChartsListener);

  const anomalyChartsSeverityListener = function () {
    const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
    if (showCharts && selectedCells !== undefined) {
      const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds());
      updateCharts(
        props.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
      );
    }
  };
  mlSelectSeverityService.state.watch(anomalyChartsSeverityListener);

  const tableControlsListener = async function () {
    setProps({
      tableData: await loadAnomaliesTableData(
        selectedCells,
        $scope.jobs,
        dateFormatTz,
        getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds(),
        props.swimlaneViewByFieldName
      )
    });
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
    mlExplorerDashboardService.swimlaneRenderDone.unwatch(swimlaneRenderDoneListener);
    mlSelectSeverityService.state.unwatch(anomalyChartsSeverityListener);
    mlSelectIntervalService.state.unwatch(tableControlsListener);
    mlSelectSeverityService.state.unwatch(tableControlsListener);
    mlSelectLimitService.state.unwatch(swimlaneLimitListener);
    selectedCells = undefined;
    refreshWatcher.cancel();
    $(window).off('resize', jqueryRedrawOnResize);
    // Cancel listening for updates to the global nav state.
    navListener();
  });

  function setViewBySwimlaneOptions() {
    // Obtain the list of 'View by' fields per job.
    setProps({ swimlaneViewByFieldName: null });
    let viewByOptions = [];   // Unique influencers for the selected job(s).

    const selectedJobIds = getSelectedJobIds($scope.jobs);
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
    setProps({ viewBySwimlaneOptions: viewByOptions });

    if (appState.mlExplorerSwimlane.viewBy !== undefined &&
      props.viewBySwimlaneOptions.indexOf(appState.mlExplorerSwimlane.viewBy) !== -1) {
      // Set the swimlane viewBy to that stored in the state (URL) if set.
      setProps({ swimlaneViewByFieldName: appState.mlExplorerSwimlane.viewBy });
    } else {
      if (selectedJobIds.length > 1) {
        // If more than one job selected, default to job ID.
        setProps({ swimlaneViewByFieldName: VIEW_BY_JOB_LABEL });
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
            setProps({ swimlaneViewByFieldName: detector.partition_field_name });
            return false;
          }

          if (_.has(detector, 'over_field_name') &&
              firstJobInfluencers.indexOf(detector.over_field_name) !== -1) {
            setProps({ swimlaneViewByFieldName: detector.over_field_name });
            return false;
          }

          // For jobs with by and over fields, don't add the 'by' field as this
          // field will only be added to the top-level fields for record type results
          // if it also an influencer over the bucket.
          if (_.has(detector, 'by_field_name') && !(_.has(detector, 'over_field_name')) &&
              firstJobInfluencers.indexOf(detector.by_field_name) !== -1) {
            setProps({ swimlaneViewByFieldName: detector.by_field_name });
            return false;
          }
        });

        if (props.swimlaneViewByFieldName === null) {
          if (firstJobInfluencers.length > 0) {
            setProps({ swimlaneViewByFieldName: firstJobInfluencers[0] });
          } else {
            // No influencers for first selected job - set to first available option.
            setProps({ swimlaneViewByFieldName: props.viewBySwimlaneOptions.length > 0 ? props.viewBySwimlaneOptions[0] : null });
          }
        }

      }

      appState.fetch();
      appState.mlExplorerSwimlane.viewBy = props.swimlaneViewByFieldName;
      appState.save();
    }
  }

  async function loadOverallData() {
    return new Promise((resolve) => {
      // Loads the overall data components i.e. the overall swimlane and influencers list.
      if (props.selectedJobs === null) {
        resolve();
      }

      setProps({
        hasResults: false,
        loading: true,
      });

      // Ensure the search bounds align to the bucketing interval used in the swimlane so
      // that the first and last buckets are complete.
      const bounds = timefilter.getActiveBounds();
      const searchBounds = getBoundsRoundedToInterval(bounds, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth), false);
      const selectedJobIds = getSelectedJobIds($scope.jobs);

      // Load the overall bucket scores by time.
      // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
      // which wouldn't be the case if e.g. '1M' was used.
      // Pass 'true' when obtaining bucket bounds due to the way the overall_buckets endpoint works
      // to ensure the search is inclusive of end time.
      const overallBucketsBounds = getBoundsRoundedToInterval(bounds, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth), true);
      mlResultsService.getOverallBucketScores(
        selectedJobIds,
        // Note there is an optimization for when top_n == 1.
        // If top_n > 1, we should test what happens when the request takes long
        // and refactor the loading calls, if necessary, to avoid delays in loading other components.
        1,
        overallBucketsBounds.min.valueOf(),
        overallBucketsBounds.max.valueOf(),
        getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds() + 's'
      ).then((resp) => {
        skipCellClicks = false;
        const overallSwimlaneData = processOverallResults(resp.results, searchBounds, $scope.jobs, props.swimlaneWidth);
        setProps({ overallSwimlaneData });
        console.log('Explorer overall swimlane data set:', overallSwimlaneData);

        if (overallSwimlaneData.points && overallSwimlaneData.points.length > 0) {
          setProps({ hasResults: true });

          // Trigger loading of the 'view by' swimlane -
          // only load once the overall swimlane so that we can match the time span.
          setViewBySwimlaneOptions();
        } else {
          setProps({ hasResults: false });
        }
        setProps({ loading: false });

        resolve();
      });
    });
  }

  function loadViewBySwimlane(fieldValues) {
    // reset the swimlane data to avoid flickering where the old dataset would briefly show up.
    setProps({
      viewBySwimlaneData: getDefaultViewBySwimlaneData(),
      viewBySwimlaneDataLoading: true,
    });

    skipCellClicks = true;
    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish(resp) {
      if (resp !== undefined) {
        setProps({
          viewBySwimlaneData: processViewByResults(
            resp.results,
            fieldValues,
            $scope.jobs,
            props.overallSwimlaneData,
            props.swimlaneViewByFieldName,
            props.swimlaneWidth
          )
        });

        // do a sanity check against selectedCells. It can happen that a previously
        // selected lane loaded via URL/AppState is not available anymore.
        if (
          selectedCells !== undefined &&
          selectedCells.type === SWIMLANE_TYPE.VIEW_BY
        ) {
          const selectionExists = selectedCells.lanes.some((lane) => {
            return (props.viewBySwimlaneData.laneLabels.includes(lane));
          });
          if (selectionExists === false) {
            clearSelectedAnomalies();
          }
        }
      }

      setProps({ viewBySwimlaneDataLoading: false });

      skipCellClicks = false;
      console.log('Explorer view by swimlane data set:', props.viewBySwimlaneData);
      if (swimlaneCellClickQueue.length > 0) {
        const latestSelectedCells = swimlaneCellClickQueue.pop();
        swimlaneCellClickQueue.length = 0;
        props.swimlaneCellClick(latestSelectedCells);
        return;
      }
    }

    if (
      props.selectedJobs === undefined ||
      props.swimlaneViewByFieldName === undefined  ||
      props.swimlaneViewByFieldName === null
    ) {
      finish();
      return;
    } else {
      // Ensure the search bounds align to the bucketing interval used in the swimlane so
      // that the first and last buckets are complete.
      const bounds = timefilter.getActiveBounds();
      const searchBounds = getBoundsRoundedToInterval(bounds, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth), false);
      const selectedJobIds = getSelectedJobIds($scope.jobs);
      const limit = mlSelectLimitService.state.get('limit');
      const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

      // load scores by influencer/jobId value and time.
      // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
      // which wouldn't be the case if e.g. '1M' was used.
      const interval = getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds() + 's';
      if (props.swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
        mlResultsService.getInfluencerValueMaxScoreByTime(
          selectedJobIds,
          props.swimlaneViewByFieldName,
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
    const selectedJobIds = getSelectedJobIds($scope.jobs);
    const limit = mlSelectLimitService.state.get('limit');
    const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

    // Find the top field values for the selected time, and then load the 'view by'
    // swimlane over the full time range for those specific field values.
    if (props.swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
      mlResultsService.getTopInfluencers(
        selectedJobIds,
        earliestMs,
        latestMs,
        swimlaneLimit
      ).then((resp) => {
        const topFieldValues = [];
        const topInfluencers = resp.influencers[props.swimlaneViewByFieldName];
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
        getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds() + 's',
        swimlaneLimit
      ).then((resp) => {
        loadViewBySwimlane(_.keys(resp.results));
      });
    }
  }

  async function updateExplorer() {
    const jobIds = (selectedCells !== undefined && selectedCells.fieldName === VIEW_BY_JOB_LABEL)
      ? selectedCells.lanes
      : getSelectedJobIds($scope.jobs);

    const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds());
    const selectionInfluencers = getSelectionInfluencers(selectedCells, props.swimlaneViewByFieldName);

    setProps({
      annotationsData: await loadAnnotationsTableData(
        selectedCells, $scope.jobs, getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds()
      )
    });

    updateCharts(props.anomalyChartRecords || [], timerange.earliestMs, timerange.latestMs);

    if (selectedCells !== undefined && selectedCells.fieldName === undefined) {
      // Click is in one of the cells in the Overall swimlane - reload the 'view by' swimlane
      // to show the top 'view by' values for the selected time.
      loadViewBySwimlaneForSelectedTime(timerange.earliestMs, timerange.latestMs);
      setProps({ viewByLoadedForTimeFormatted: formatHumanReadableDateTime(timerange.earliestMs) });
    }

    let influencers;

    if (selectionInfluencers.length === 0) {
      influencers = await loadTopInfluencers(jobIds, timerange.earliestMs, timerange.latestMs, props.noInfluencersConfigured);
    }

    const anomalyChartRecords = await loadDataForCharts(
      jobIds, timerange.earliestMs, timerange.latestMs, selectionInfluencers, selectedCells
    );

    if (selectionInfluencers.length > 0 && anomalyChartRecords !== undefined) {
      influencers = await getFilteredTopInfluencers(
        jobIds, timerange.earliestMs, timerange.latestMs, anomalyChartRecords, selectionInfluencers, props.noInfluencersConfigured
      );
    }

    if (anomalyChartRecords !== undefined) {
      setProps({ anomalyChartRecords, influencers });

      if (mlCheckboxShowChartsService.state.get('showCharts')) {
        updateCharts(
          props.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      }
    }

    setProps({
      tableData: await loadAnomaliesTableData(
        selectedCells,
        $scope.jobs,
        dateFormatTz,
        getSwimlaneBucketInterval($scope.jobs, props.swimlaneWidth).asSeconds(),
        props.swimlaneViewByFieldName
      )
    });
  }

  function clearSelectedAnomalies() {
    setProps({
      anomalyChartRecords: [],
      viewByLoadedForTimeFormatted: null,
    });
    selectedCells = undefined;
    clearSwimlaneSelectionFromAppState();
    updateExplorer();
  }
});
