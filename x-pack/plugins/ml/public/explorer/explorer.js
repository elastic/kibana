/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import DragSelect from 'dragselect';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { AnnotationsTable } from '../components/annotations_table';
import {
  ExplorerNoInfluencersFound,
  ExplorerNoJobsFound,
  ExplorerNoResultsFound,
} from './components';
import { ExplorerSwimlane } from './explorer_swimlane';
import { formatHumanReadableDateTime } from '../util/date_utils';
import { getBoundsRoundedToInterval } from 'plugins/ml/util/ml_time_buckets';
import { InfluencersList } from '../components/influencers_list';
import { mlExplorerDashboardService } from './explorer_dashboard_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { CheckboxShowCharts, mlCheckboxShowChartsService } from '../components/controls/checkbox_showcharts/checkbox_showcharts';
import { SelectInterval, mlSelectIntervalService } from '../components/controls/select_interval/select_interval';
import { SelectLimit, mlSelectLimitService } from './select_limit/select_limit';
import { SelectSeverity, mlSelectSeverityService } from '../components/controls/select_severity/select_severity';

import {
  getClearedSelectedAnomaliesState,
  getDefaultViewBySwimlaneData,
  getFilteredTopInfluencers,
  getSelectionInfluencers,
  getSelectionTimeRange,
  getViewBySwimlaneOptions,
  loadAnnotationsTableData,
  loadAnomaliesTableData,
  loadDataForCharts,
  loadTopInfluencers,
  processOverallResults,
  processViewByResults,
  selectedJobsHaveInfluencers,
} from './explorer_utils';
import {
  explorerChartsContainerServiceFactory,
  getDefaultChartsData
} from './explorer_charts/explorer_charts_container_service';
import {
  getSwimlaneContainerWidth
} from './legacy_utils';

import {
  DRAG_SELECT_ACTION,
  APP_STATE_ACTION,
  EXPLORER_ACTION,
  SWIMLANE_DEFAULT_LIMIT,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';

// Explorer Charts
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';

// Anomalies Table
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { timefilter } from 'ui/timefilter';

function getExplorerDefaultState() {
  return {
    annotationsData: [],
    anomalyChartRecords: [],
    chartsData: getDefaultChartsData(),
    hasResults: false,
    influencers: {},
    loading: true,
    noInfluencersConfigured: true,
    noJobsFound: true,
    overallSwimlaneData: [],
    selectedCells: null,
    selectedJobs: null,
    swimlaneViewByFieldName: undefined,
    tableData: {},
    viewByLoadedForTimeFormatted: null,
    viewBySwimlaneData: getDefaultViewBySwimlaneData(),
    viewBySwimlaneDataLoading: false,
    viewBySwimlaneOptions: [],
  };
}

function mapSwimlaneOptionsToEuiOptions(options) {
  return options.map(option => ({
    value: option,
    text: option,
  }));
}

export const Explorer = injectI18n(
  class Explorer extends React.Component {
    static propTypes = {
      appStateHandler: PropTypes.func.isRequired,
      dateFormatTz: PropTypes.string.isRequired,
      mlJobSelectService: PropTypes.object.isRequired,
      MlTimeBuckets: PropTypes.func.isRequired,
    };

    state = getExplorerDefaultState();

    // helper to avoid calling `setState()` in the listener for chart updates.
    _isMounted = false;

    // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
    disableDragSelectOnMouseLeave = true;
    // skip listening to clicks on swimlanes while they are loading to avoid race conditions
    skipCellClicks = true;

    updateCharts = explorerChartsContainerServiceFactory((data) => {
      if (this._isMounted) {
        this.setState({
          chartsData: {
            ...getDefaultChartsData(),
            chartsPerRow: data.chartsPerRow,
            seriesToPlot: data.seriesToPlot,
            // convert truthy/falsy value to Boolean
            tooManyBuckets: !!data.tooManyBuckets,
          }
        });
      }
    });

    ALLOW_CELL_RANGE_SELECTION = mlExplorerDashboardService.allowCellRangeSelection;

    dragSelect = new DragSelect({
      selectables: document.getElementsByClassName('sl-cell'),
      callback(elements) {
        if (elements.length > 1 && !this.ALLOW_CELL_RANGE_SELECTION) {
          elements = [elements[0]];
        }

        if (elements.length > 0) {
          mlExplorerDashboardService.dragSelect.changed({
            action: DRAG_SELECT_ACTION.NEW_SELECTION,
            elements
          });
        }

        this.disableDragSelectOnMouseLeave = true;
      },
      onDragStart() {
        if (this.ALLOW_CELL_RANGE_SELECTION) {
          mlExplorerDashboardService.dragSelect.changed({
            action: DRAG_SELECT_ACTION.DRAG_START
          });
          this.disableDragSelectOnMouseLeave = false;
        }
      },
      onElementSelect() {
        if (this.ALLOW_CELL_RANGE_SELECTION) {
          mlExplorerDashboardService.dragSelect.changed({
            action: DRAG_SELECT_ACTION.ELEMENT_SELECT
          });
        }
      }
    });

    dashboardListener = ((action, payload = {}) => {
      // Listen to the initial loading of jobs
      if (action === EXPLORER_ACTION.INITIALIZE) {
        const { noJobsFound, selectedCells, selectedJobs, swimlaneViewByFieldName } = payload;
        let currentSelectedCells = this.state.selectedCells;
        let currentSwimlaneViewByFieldName = this.state.swimlaneViewByFieldName;

        if (selectedCells !== undefined && currentSelectedCells === null) {
          currentSelectedCells = selectedCells;
          currentSwimlaneViewByFieldName = swimlaneViewByFieldName;
        }

        const stateUpdate = {
          noInfluencersConfigured: !selectedJobsHaveInfluencers(selectedJobs),
          noJobsFound,
          selectedCells: currentSelectedCells,
          selectedJobs,
          swimlaneViewByFieldName: currentSwimlaneViewByFieldName
        };

        this.updateExplorer(stateUpdate, true);
      }

      // Listen for changes to job selection.
      if (action === EXPLORER_ACTION.JOB_SELECTION_CHANGE) {
        const { selectedJobs } = payload;
        const stateUpdate = {
          noInfluencersConfigured: !selectedJobsHaveInfluencers(selectedJobs),
          selectedJobs,
        };

        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
        Object.assign(stateUpdate, getClearedSelectedAnomaliesState());

        if (selectedJobs.length > 1) {
          this.props.appStateHandler(
            APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
            { swimlaneViewByFieldName: VIEW_BY_JOB_LABEL },
          );
          stateUpdate.swimlaneViewByFieldName = VIEW_BY_JOB_LABEL;
          // enforce a state update for swimlaneViewByFieldName
          this.setState({ swimlaneViewByFieldName: VIEW_BY_JOB_LABEL }, () => {
            this.updateExplorer(stateUpdate, true);
          });
          return;
        }

        this.updateExplorer(stateUpdate, true);
      }

      // RELOAD reloads full Anomaly Explorer and clears the selection.
      if (action === EXPLORER_ACTION.RELOAD) {
        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
        this.updateExplorer({ ...payload, ...getClearedSelectedAnomaliesState() }, true);
      }

      // REDRAW reloads Anomaly Explorer and tries to retain the selection.
      if (action === EXPLORER_ACTION.REDRAW) {
        this.updateExplorer({}, false);
      }
    });

    checkboxShowChartsListener = () => {
      const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
      const { selectedCells, selectedJobs } = this.state;

      const bounds = timefilter.getActiveBounds();
      const timerange = getSelectionTimeRange(
        selectedCells,
        this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        bounds,
      );

      if (showCharts && selectedCells !== null) {
        this.updateCharts(
          this.state.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      } else {
        this.updateCharts(
          [], timerange.earliestMs, timerange.latestMs
        );
      }
    };

    anomalyChartsSeverityListener = () => {
      const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
      const { anomalyChartRecords, selectedCells, selectedJobs } = this.state;
      if (showCharts && selectedCells !== null) {
        const bounds = timefilter.getActiveBounds();
        const timerange = getSelectionTimeRange(
          selectedCells,
          this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
          bounds,
        );
        this.updateCharts(
          anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      }
    };

    tableControlsListener = async () => {
      const { dateFormatTz } = this.props;
      const { selectedCells, swimlaneViewByFieldName, selectedJobs } = this.state;
      const bounds = timefilter.getActiveBounds();
      const tableData = await loadAnomaliesTableData(
        selectedCells,
        selectedJobs,
        dateFormatTz,
        this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        bounds,
        swimlaneViewByFieldName
      );
      this.setState({ tableData });
    };

    swimlaneLimitListener = () => {
      this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
      this.updateExplorer(getClearedSelectedAnomaliesState(), false);
    };

    // Listens to render updates of the swimlanes to update dragSelect
    swimlaneRenderDoneListener = () => {
      this.dragSelect.clearSelection();
      this.dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
    };

    componentDidMount() {
      this._isMounted = true;
      mlExplorerDashboardService.explorer.watch(this.dashboardListener);
      mlCheckboxShowChartsService.state.watch(this.checkboxShowChartsListener);
      mlSelectLimitService.state.watch(this.swimlaneLimitListener);
      mlSelectSeverityService.state.watch(this.anomalyChartsSeverityListener);
      mlSelectIntervalService.state.watch(this.tableControlsListener);
      mlSelectSeverityService.state.watch(this.tableControlsListener);
    }

    componentWillUnmount() {
      this._isMounted = false;
      mlExplorerDashboardService.explorer.unwatch(this.dashboardListener);
      mlCheckboxShowChartsService.state.unwatch(this.checkboxShowChartsListener);
      mlSelectLimitService.state.unwatch(this.swimlaneLimitListener);
      mlSelectSeverityService.state.unwatch(this.anomalyChartsSeverityListener);
      mlSelectIntervalService.state.unwatch(this.tableControlsListener);
      mlSelectSeverityService.state.unwatch(this.tableControlsListener);
    }

    getSwimlaneBucketInterval(selectedJobs) {
      const { MlTimeBuckets } = this.props;

      const swimlaneWidth = getSwimlaneContainerWidth(this.state.noInfluencersConfigured);
      // Bucketing interval should be the maximum of the chart related interval (i.e. time range related)
      // and the max bucket span for the jobs shown in the chart.
      const bounds = timefilter.getActiveBounds();
      const buckets = new MlTimeBuckets();
      buckets.setInterval('auto');
      buckets.setBounds(bounds);

      const intervalSeconds = buckets.getInterval().asSeconds();

      // if the swimlane cell widths are too small they will not be visible
      // calculate how many buckets will be drawn before the swimlanes are actually rendered
      // and increase the interval to widen the cells if they're going to be smaller than 8px
      // this has to be done at this stage so all searches use the same interval
      const timerangeSeconds = (bounds.max.valueOf() - bounds.min.valueOf()) / 1000;
      const numBuckets = parseInt(timerangeSeconds / intervalSeconds);
      const cellWidth = Math.floor(swimlaneWidth / numBuckets * 100) / 100;

      // if the cell width is going to be less than 8px, double the interval
      if (cellWidth < 8) {
        buckets.setInterval((intervalSeconds * 2) + 's');
      }

      const maxBucketSpanSeconds = selectedJobs.reduce((memo, job) => Math.max(memo, job.bucketSpanSeconds), 0);
      if (maxBucketSpanSeconds > intervalSeconds) {
        buckets.setInterval(maxBucketSpanSeconds + 's');
        buckets.setBounds(bounds);
      }

      return buckets.getInterval();
    }

    loadOverallDataPreviousArgs = null;
    loadOverallDataPreviousData = null;
    loadOverallData(selectedJobs, interval, bounds, showLoadingIndicator = true) {
      return new Promise((resolve) => {
        // Loads the overall data components i.e. the overall swimlane and influencers list.
        if (selectedJobs === null) {
          resolve({
            loading: false,
            hasResuts: false
          });
          return;
        }

        // check if we can just return existing cached data
        const compareArgs = {
          selectedJobs,
          intervalAsSeconds: interval.asSeconds(),
          boundsMin: bounds.min.valueOf(),
          boundsMax: bounds.max.valueOf(),
        };

        if (_.isEqual(compareArgs, this.loadOverallDataPreviousArgs)) {
          const overallSwimlaneData = this.loadOverallDataPreviousData;
          const hasResults = (overallSwimlaneData.points && overallSwimlaneData.points.length > 0);
          resolve({
            hasResults,
            loading: false,
            overallSwimlaneData,
          });
          return;
        }

        this.loadOverallDataPreviousArgs = compareArgs;

        if (showLoadingIndicator) {
          this.setState({ hasResults: false, loading: true });
        }

        // Ensure the search bounds align to the bucketing interval used in the swimlane so
        // that the first and last buckets are complete.
        const searchBounds = getBoundsRoundedToInterval(
          bounds,
          interval,
          false
        );
        const selectedJobIds = selectedJobs.map(d => d.id);

        // Load the overall bucket scores by time.
        // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
        // which wouldn't be the case if e.g. '1M' was used.
        // Pass 'true' when obtaining bucket bounds due to the way the overall_buckets endpoint works
        // to ensure the search is inclusive of end time.
        const overallBucketsBounds = getBoundsRoundedToInterval(
          bounds,
          interval,
          true
        );
        mlResultsService.getOverallBucketScores(
          selectedJobIds,
          // Note there is an optimization for when top_n == 1.
          // If top_n > 1, we should test what happens when the request takes long
          // and refactor the loading calls, if necessary, to avoid delays in loading other components.
          1,
          overallBucketsBounds.min.valueOf(),
          overallBucketsBounds.max.valueOf(),
          interval.asSeconds() + 's'
        ).then((resp) => {
          this.skipCellClicks = false;
          const overallSwimlaneData = processOverallResults(
            resp.results,
            searchBounds,
            interval.asSeconds(),
          );
          this.loadOverallDataPreviousData = overallSwimlaneData;

          console.log('Explorer overall swimlane data set:', overallSwimlaneData);
          const hasResults = (overallSwimlaneData.points && overallSwimlaneData.points.length > 0);
          resolve({
            hasResults,
            loading: false,
            overallSwimlaneData,
          });
        });
      });
    }

    loadViewBySwimlanePreviousArgs = null;
    loadViewBySwimlanePreviousData = null;
    loadViewBySwimlane(fieldValues, overallSwimlaneData, selectedJobs, swimlaneViewByFieldName) {
      const limit = mlSelectLimitService.state.get('limit');
      const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

      const compareArgs = {
        fieldValues,
        overallSwimlaneData,
        selectedJobs,
        swimlaneLimit,
        swimlaneViewByFieldName,
        interval: this.getSwimlaneBucketInterval(selectedJobs).asSeconds()
      };

      return new Promise((resolve) => {
        this.skipCellClicks = true;

        // check if we can just return existing cached data
        if (_.isEqual(compareArgs, this.loadViewBySwimlanePreviousArgs)) {
          this.skipCellClicks = false;

          resolve({
            viewBySwimlaneData: this.loadViewBySwimlanePreviousData,
            viewBySwimlaneDataLoading: false
          });
          return;
        }

        this.setState({
          viewBySwimlaneData: getDefaultViewBySwimlaneData(),
          viewBySwimlaneDataLoading: true
        });

        const finish = (resp) => {
          this.skipCellClicks = false;
          if (resp !== undefined) {
            const viewBySwimlaneData = processViewByResults(
              resp.results,
              fieldValues,
              overallSwimlaneData,
              swimlaneViewByFieldName,
              this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
            );
            this.loadViewBySwimlanePreviousArgs = compareArgs;
            this.loadViewBySwimlanePreviousData = viewBySwimlaneData;
            console.log('Explorer view by swimlane data set:', viewBySwimlaneData);

            resolve({
              viewBySwimlaneData,
              viewBySwimlaneDataLoading: false
            });
          } else {
            resolve({ viewBySwimlaneDataLoading: false });
          }
        };

        if (
          selectedJobs === undefined ||
          swimlaneViewByFieldName === undefined
        ) {
          finish();
          return;
        } else {
          // Ensure the search bounds align to the bucketing interval used in the swimlane so
          // that the first and last buckets are complete.
          const bounds = timefilter.getActiveBounds();
          const searchBounds = getBoundsRoundedToInterval(
            bounds,
            this.getSwimlaneBucketInterval(selectedJobs),
            false,
          );
          const selectedJobIds = selectedJobs.map(d => d.id);

          // load scores by influencer/jobId value and time.
          // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
          // which wouldn't be the case if e.g. '1M' was used.
          const interval = `${this.getSwimlaneBucketInterval(selectedJobs).asSeconds()}s`;
          if (swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
            mlResultsService.getInfluencerValueMaxScoreByTime(
              selectedJobIds,
              swimlaneViewByFieldName,
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
      });
    }

    topFieldsPreviousArgs = null;
    topFieldsPreviousData = null;
    loadViewByTopFieldValuesForSelectedTime(earliestMs, latestMs, selectedJobs, swimlaneViewByFieldName) {
      const selectedJobIds = selectedJobs.map(d => d.id);
      const limit = mlSelectLimitService.state.get('limit');
      const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

      const compareArgs = {
        earliestMs, latestMs, selectedJobIds, swimlaneLimit, swimlaneViewByFieldName,
        interval: this.getSwimlaneBucketInterval(selectedJobs).asSeconds()
      };

      // Find the top field values for the selected time, and then load the 'view by'
      // swimlane over the full time range for those specific field values.
      return new Promise((resolve) => {
        if (_.isEqual(compareArgs, this.topFieldsPreviousArgs)) {
          resolve(this.topFieldsPreviousData);
          return;
        }
        this.topFieldsPreviousArgs = compareArgs;

        if (swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
          mlResultsService.getTopInfluencers(
            selectedJobIds,
            earliestMs,
            latestMs,
            swimlaneLimit
          ).then((resp) => {
            if (resp.influencers[swimlaneViewByFieldName] === undefined) {
              this.topFieldsPreviousData = [];
              resolve([]);
            }

            const topFieldValues = [];
            const topInfluencers = resp.influencers[swimlaneViewByFieldName];
            topInfluencers.forEach((influencerData) => {
              if (influencerData.maxAnomalyScore > 0) {
                topFieldValues.push(influencerData.influencerFieldValue);
              }
            });
            this.topFieldsPreviousData = topFieldValues;
            resolve(topFieldValues);
          });
        } else {
          mlResultsService.getScoresByBucket(
            selectedJobIds,
            earliestMs,
            latestMs,
            this.getSwimlaneBucketInterval(selectedJobs).asSeconds() + 's',
            swimlaneLimit
          ).then((resp) => {
            const topFieldValues = Object.keys(resp.results);
            this.topFieldsPreviousData = topFieldValues;
            resolve(topFieldValues);
          });
        }
      });
    }

    anomaliesTablePreviousArgs = null;
    anomaliesTablePreviousData = null;
    annotationsTablePreviousArgs = null;
    annotationsTablePreviousData = null;
    async updateExplorer(stateUpdate, showOverallLoadingIndicator = true) {
      const {
        noInfluencersConfigured,
        noJobsFound,
        selectedCells,
        selectedJobs,
      } = {
        ...this.state,
        ...stateUpdate
      };

      this.skipCellClicks = false;

      if (noJobsFound) {
        this.setState(stateUpdate);
        return;
      }

      if (this.swimlaneCellClickQueue.length > 0) {
        this.setState(stateUpdate);

        const latestSelectedCells = this.swimlaneCellClickQueue.pop();
        this.swimlaneCellClickQueue.length = 0;
        this.swimlaneCellClick(latestSelectedCells);
        return;
      }

      const { dateFormatTz } = this.props;

      const jobIds = (selectedCells !== null && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL)
        ? selectedCells.lanes
        : selectedJobs.map(d => d.id);

      const bounds = timefilter.getActiveBounds();
      const timerange = getSelectionTimeRange(
        selectedCells,
        this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        bounds,
      );

      // Load the overall data - if the FieldFormats failed to populate
      // the default formatting will be used for metric values.
      Object.assign(
        stateUpdate,
        await this.loadOverallData(
          selectedJobs,
          this.getSwimlaneBucketInterval(selectedJobs),
          bounds,
          showOverallLoadingIndicator,
        )
      );

      const { overallSwimlaneData } = stateUpdate;

      const annotationsTableCompareArgs = {
        selectedCells,
        selectedJobs,
        interval: this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        boundsMin: bounds.min.valueOf(),
        boundsMax: bounds.max.valueOf(),
      };

      if (_.isEqual(annotationsTableCompareArgs, this.annotationsTablePreviousArgs)) {
        stateUpdate.annotationsData = this.annotationsTablePreviousData;
      } else {
        this.annotationsTablePreviousArgs = annotationsTableCompareArgs;
        stateUpdate.annotationsData = this.annotationsTablePreviousData = await loadAnnotationsTableData(
          selectedCells,
          selectedJobs,
          this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
          bounds,
        );
      }

      const viewBySwimlaneOptions = getViewBySwimlaneOptions(selectedJobs, this.state.swimlaneViewByFieldName);
      Object.assign(stateUpdate, viewBySwimlaneOptions);
      if (selectedCells !== null && selectedCells.showTopFieldValues === true) {
        // this.setState({ viewBySwimlaneData: getDefaultViewBySwimlaneData(), viewBySwimlaneDataLoading: true });
        // Click is in one of the cells in the Overall swimlane - reload the 'view by' swimlane
        // to show the top 'view by' values for the selected time.
        const topFieldValues = await this.loadViewByTopFieldValuesForSelectedTime(
          timerange.earliestMs,
          timerange.latestMs,
          selectedJobs,
          viewBySwimlaneOptions.swimlaneViewByFieldName
        );
        Object.assign(
          stateUpdate,
          await this.loadViewBySwimlane(
            topFieldValues,
            overallSwimlaneData,
            selectedJobs,
            viewBySwimlaneOptions.swimlaneViewByFieldName
          ),
          { viewByLoadedForTimeFormatted: formatHumanReadableDateTime(timerange.earliestMs) }
        );
      } else {
        Object.assign(
          stateUpdate,
          viewBySwimlaneOptions,
          await this.loadViewBySwimlane(
            [],
            overallSwimlaneData,
            selectedJobs,
            viewBySwimlaneOptions.swimlaneViewByFieldName
          ),
        );
      }

      const { viewBySwimlaneData } = stateUpdate;

      // do a sanity check against selectedCells. It can happen that a previously
      // selected lane loaded via URL/AppState is not available anymore.
      let clearSelection = false;
      if (
        selectedCells !== null &&
        selectedCells.type === SWIMLANE_TYPE.VIEW_BY
      ) {
        clearSelection = !selectedCells.lanes.some((lane) => {
          return viewBySwimlaneData.points.some((point) => {
            return (
              point.laneLabel === lane &&
              point.time === selectedCells.times[0]
            );
          });
        });
      }

      if (clearSelection === true) {
        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
        Object.assign(stateUpdate, getClearedSelectedAnomaliesState());
      }

      const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneOptions.swimlaneViewByFieldName);

      if (selectionInfluencers.length === 0) {
        stateUpdate.influencers = await loadTopInfluencers(jobIds, timerange.earliestMs, timerange.latestMs, noInfluencersConfigured);
      }

      const updatedAnomalyChartRecords = await loadDataForCharts(
        jobIds, timerange.earliestMs, timerange.latestMs, selectionInfluencers, selectedCells
      );

      if (selectionInfluencers.length > 0 && updatedAnomalyChartRecords !== undefined) {
        stateUpdate.influencers = await getFilteredTopInfluencers(
          jobIds,
          timerange.earliestMs,
          timerange.latestMs,
          updatedAnomalyChartRecords,
          selectionInfluencers,
          noInfluencersConfigured,
        );
      }

      stateUpdate.anomalyChartRecords = updatedAnomalyChartRecords || [];

      this.setState(stateUpdate);

      if (mlCheckboxShowChartsService.state.get('showCharts') && selectedCells !== null) {
        this.updateCharts(
          stateUpdate.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      } else {
        this.updateCharts(
          [], timerange.earliestMs, timerange.latestMs
        );
      }

      const anomaliesTableCompareArgs = {
        selectedCells,
        selectedJobs,
        dateFormatTz,
        interval: this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        boundsMin: bounds.min.valueOf(),
        boundsMax: bounds.max.valueOf(),
        swimlaneViewByFieldName: viewBySwimlaneOptions.swimlaneViewByFieldName,
      };

      if (_.isEqual(anomaliesTableCompareArgs, this.anomaliesTablePreviousArgs)) {
        this.setState(this.anomaliesTablePreviousData);
      } else {
        this.anomaliesTablePreviousArgs = anomaliesTableCompareArgs;
        const tableData = this.anomaliesTablePreviousData = await loadAnomaliesTableData(
          selectedCells,
          selectedJobs,
          dateFormatTz,
          this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
          bounds,
          viewBySwimlaneOptions.swimlaneViewByFieldName
        );
        this.setState({ tableData });
      }
    }

    viewByChangeHandler = e => this.setSwimlaneViewBy(e.target.value);
    setSwimlaneViewBy = (swimlaneViewByFieldName) => {
      this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
      this.props.appStateHandler(APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME, { swimlaneViewByFieldName });
      this.setState({ swimlaneViewByFieldName }, () => {
        this.updateExplorer({
          swimlaneViewByFieldName,
          ...getClearedSelectedAnomaliesState(),
        }, false);
      });
    };

    onSwimlaneEnterHandler = () => this.setSwimlaneSelectActive(true);
    onSwimlaneLeaveHandler = () => this.setSwimlaneSelectActive(false);
    setSwimlaneSelectActive = (active) => {
      if (!active && this.disableDragSelectOnMouseLeave) {
        this.dragSelect.clearSelection();
        this.dragSelect.stop();
        return;
      }
      this.dragSelect.start();
    };

    // This queue tracks click events while the swimlanes are loading.
    // To avoid race conditions we keep the click events selectedCells in this queue
    // and trigger another event only after the current loading is done.
    // The queue is necessary since a click in the overall swimlane triggers
    // an update of the viewby swimlanes. If we'd just ignored click events
    // during the loading, we could miss programmatically triggered events like
    // those coming via AppState when a selection is part of the URL.
    swimlaneCellClickQueue = [];

    // Listener for click events in the swimlane to load corresponding anomaly data.
    swimlaneCellClick = (swimlaneSelectedCells) => {
      if (this.skipCellClicks === true) {
        this.swimlaneCellClickQueue.push(swimlaneSelectedCells);
        return;
      }

      // If selectedCells is an empty object we clear any existing selection,
      // otherwise we save the new selection in AppState and update the Explorer.
      if (Object.keys(swimlaneSelectedCells).length === 0) {
        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);

        const stateUpdate = getClearedSelectedAnomaliesState();
        this.updateExplorer(stateUpdate, false);
      } else {
        swimlaneSelectedCells.showTopFieldValues = false;

        const currentSwimlaneType = _.get(this.state, 'selectedCells.type');
        const currentShowTopFieldValues = _.get(this.state, 'selectedCells.showTopFieldValues', false);
        const newSwimlaneType = _.get(swimlaneSelectedCells, 'type');

        if (
          (currentSwimlaneType === SWIMLANE_TYPE.OVERALL && newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
          newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
          currentShowTopFieldValues === true
        ) {
          swimlaneSelectedCells.showTopFieldValues = true;
        }

        this.props.appStateHandler(APP_STATE_ACTION.SAVE_SELECTION, { swimlaneSelectedCells });
        this.updateExplorer({ selectedCells: swimlaneSelectedCells }, false);
      }
    }

    render() {
      const {
        intl,
        MlTimeBuckets,
      } = this.props;

      const {
        annotationsData,
        anomalyChartRecords,
        chartsData,
        influencers,
        hasResults,
        noInfluencersConfigured,
        noJobsFound,
        overallSwimlaneData,
        selectedCells,
        swimlaneViewByFieldName,
        tableData,
        viewByLoadedForTimeFormatted,
        viewBySwimlaneData,
        viewBySwimlaneDataLoading,
        viewBySwimlaneOptions,
      } = this.state;

      const loading = this.props.loading || this.state.loading;

      const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);

      if (loading === true) {
        return (
          <LoadingIndicator
            label={intl.formatMessage({
              id: 'xpack.ml.explorer.loadingLabel',
              defaultMessage: 'Loading',
            })}
          />
        );
      }

      if (noJobsFound) {
        return <ExplorerNoJobsFound />;
      }

      if (noJobsFound && hasResults === false) {
        return <ExplorerNoResultsFound />;
      }

      const mainColumnWidthClassName = noInfluencersConfigured === true ? 'col-xs-12' : 'col-xs-10';
      const mainColumnClasses = `column ${mainColumnWidthClassName}`;

      const showViewBySwimlane = (
        viewBySwimlaneData !== null &&
        viewBySwimlaneData.laneLabels &&
        viewBySwimlaneData.laneLabels.length > 0
      );

      return (
        <div className="results-container">
          {noInfluencersConfigured && (
            <div className="no-influencers-warning">
              <EuiIconTip
                content={intl.formatMessage({
                  id: 'xpack.ml.explorer.noConfiguredInfluencersTooltip',
                  defaultMessage:
                    'The Top Influencers list is hidden because no influencers have been configured for the selected jobs.',
                })}
                position="right"
                type="iInCircle"
              />
            </div>
          )}

          {noInfluencersConfigured === false && (
            <div className="column col-xs-2 euiText">
              <span className="panel-title">
                <FormattedMessage
                  id="xpack.ml.explorer.topInfuencersTitle"
                  defaultMessage="Top Influencers"
                />
              </span>
              <InfluencersList influencers={influencers} />
            </div>
          )}

          <div className={mainColumnClasses}>
            <span className="panel-title euiText">
              <FormattedMessage
                id="xpack.ml.explorer.anomalyTimelineTitle"
                defaultMessage="Anomaly timeline"
              />
            </span>

            <div
              className="ml-explorer-swimlane euiText"
              onMouseEnter={this.onSwimlaneEnterHandler}
              onMouseLeave={this.onSwimlaneLeaveHandler}
            >
              <ExplorerSwimlane
                chartWidth={swimlaneWidth}
                MlTimeBuckets={MlTimeBuckets}
                swimlaneCellClick={this.swimlaneCellClick}
                swimlaneData={overallSwimlaneData}
                swimlaneType={SWIMLANE_TYPE.OVERALL}
                selection={selectedCells}
                swimlaneRenderDoneListener={this.swimlaneRenderDoneListener}
              />
            </div>

            {viewBySwimlaneOptions.length > 0 && (
              <React.Fragment>
                <EuiFlexGroup direction="row" gutterSize="l" responsive={true}>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={intl.formatMessage({
                        id: 'xpack.ml.explorer.viewByLabel',
                        defaultMessage: 'View by',
                      })}
                    >
                      <EuiSelect
                        id="selectViewBy"
                        options={mapSwimlaneOptionsToEuiOptions(viewBySwimlaneOptions)}
                        value={swimlaneViewByFieldName}
                        onChange={this.viewByChangeHandler}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={intl.formatMessage({
                        id: 'xpack.ml.explorer.limitLabel',
                        defaultMessage: 'Limit',
                      })}
                    >
                      <SelectLimit />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                    <EuiFormRow label="&#8203;">
                      <div className="panel-sub-title">
                        {viewByLoadedForTimeFormatted && (
                          <FormattedMessage
                            id="xpack.ml.explorer.sortedByMaxAnomalyScoreForTimeFormattedLabel"
                            defaultMessage="(Sorted by max anomaly score for {viewByLoadedForTimeFormatted})"
                            values={{ viewByLoadedForTimeFormatted }}
                          />
                        )}
                        {viewByLoadedForTimeFormatted === undefined && (
                          <FormattedMessage
                            id="xpack.ml.explorer.sortedByMaxAnomalyScoreLabel"
                            defaultMessage="(Sorted by max anomaly score)"
                          />
                        )}
                      </div>
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>

                {showViewBySwimlane && (
                  <div
                    className="ml-explorer-swimlane euiText"
                    onMouseEnter={this.onSwimlaneEnterHandler}
                    onMouseLeave={this.onSwimlaneLeaveHandler}
                  >
                    <ExplorerSwimlane
                      chartWidth={swimlaneWidth}
                      MlTimeBuckets={MlTimeBuckets}
                      swimlaneCellClick={this.swimlaneCellClick}
                      swimlaneData={viewBySwimlaneData}
                      swimlaneType={SWIMLANE_TYPE.VIEW_BY}
                      selection={selectedCells}
                      swimlaneRenderDoneListener={this.swimlaneRenderDoneListener}
                    />
                  </div>
                )}

                {viewBySwimlaneDataLoading && (
                  <LoadingIndicator/>
                )}

                {!showViewBySwimlane && !viewBySwimlaneDataLoading && swimlaneViewByFieldName !== null && (
                  <ExplorerNoInfluencersFound swimlaneViewByFieldName={swimlaneViewByFieldName} />
                )}
              </React.Fragment>
            )}

            {annotationsData.length > 0 && (
              <React.Fragment>
                <span className="panel-title euiText">
                  <FormattedMessage
                    id="xpack.ml.explorer.annotationsTitle"
                    defaultMessage="Annotations"
                  />
                </span>
                <AnnotationsTable
                  annotations={annotationsData}
                  drillDown={true}
                  numberBadge={false}
                />
                <br />
                <br />
              </React.Fragment>
            )}

            <span className="panel-title euiText">
              <FormattedMessage id="xpack.ml.explorer.anomaliesTitle" defaultMessage="Anomalies" />
            </span>

            <EuiFlexGroup
              direction="row"
              gutterSize="l"
              responsive={true}
              className="ml-anomalies-controls"
            >
              <EuiFlexItem grow={false} style={{ width: '170px' }}>
                <EuiFormRow
                  label={intl.formatMessage({
                    id: 'xpack.ml.explorer.severityThresholdLabel',
                    defaultMessage: 'Severity threshold',
                  })}
                >
                  <SelectSeverity />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: '170px' }}>
                <EuiFormRow
                  label={intl.formatMessage({
                    id: 'xpack.ml.explorer.intervalLabel',
                    defaultMessage: 'Interval',
                  })}
                >
                  <SelectInterval />
                </EuiFormRow>
              </EuiFlexItem>
              {anomalyChartRecords.length > 0 && (
                <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                  <EuiFormRow label="&#8203;">
                    <CheckboxShowCharts />
                  </EuiFormRow>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <div className="euiText explorer-charts">
              <ExplorerChartsContainer {...chartsData} />
            </div>

            <AnomaliesTable tableData={tableData} timefilter={timefilter} />
          </div>
        </div>
      );
    }
  }
);
