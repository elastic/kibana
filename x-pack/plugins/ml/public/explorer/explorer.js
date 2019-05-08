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
import { map } from 'rxjs/operators';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { annotationsRefresh$ } from '../services/annotations_service';
import { AnnotationFlyout } from '../components/annotations/annotation_flyout';
import { AnnotationsTable } from '../components/annotations/annotations_table';
import {
  ExplorerNoInfluencersFound,
  ExplorerNoJobsFound,
  ExplorerNoResultsFound,
} from './components';
import { ExplorerSwimlane } from './explorer_swimlane';
import { KqlFilterBar } from '../components/kql_filter_bar';
import { formatHumanReadableDateTime } from '../util/date_utils';
import { getBoundsRoundedToInterval } from 'plugins/ml/util/ml_time_buckets';
import { InfluencersList } from '../components/influencers_list';
import { ALLOW_CELL_RANGE_SELECTION, dragSelect$, explorer$ } from './explorer_dashboard_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { CheckboxShowCharts, showCharts$ } from '../components/controls/checkbox_showcharts/checkbox_showcharts';
import { SelectInterval, interval$ } from '../components/controls/select_interval/select_interval';
import { SelectLimit, limit$ } from './select_limit/select_limit';
import { SelectSeverity, severity$ } from '../components/controls/select_severity/select_severity';
import { injectObservablesAsProps } from '../util/observable_utils';
import {
  getKqlQueryValues,
  removeFilterFromQueryString,
  getQueryPattern,
  escapeParens,
  escapeDoubleQuotes
} from '../components/kql_filter_bar/utils';

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
  getInfluencers,
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
  FILTER_ACTION,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
import { ML_RESULTS_INDEX_PATTERN } from '../../common/constants/index_patterns';

// Explorer Charts
import { ExplorerChartsContainer } from './explorer_charts/explorer_charts_container';

// Anomalies Table
import { AnomaliesTable } from '../components/anomalies_table/anomalies_table';
import { timefilter } from 'ui/timefilter';
import { toastNotifications } from 'ui/notify';

function getExplorerDefaultState() {
  return {
    annotationsData: [],
    anomalyChartRecords: [],
    chartsData: getDefaultChartsData(),
    filterActive: false,
    filteredFields: [],
    filterPlaceHolder: undefined,
    indexPattern: { title: ML_RESULTS_INDEX_PATTERN, fields: [] },
    influencersFilterQuery: undefined,
    hasResults: false,
    influencers: {},
    isAndOperator: false,
    loading: true,
    noInfluencersConfigured: true,
    noJobsFound: true,
    overallSwimlaneData: [],
    queryString: '',
    selectedCells: null,
    selectedJobs: null,
    swimlaneViewByFieldName: undefined,
    tableData: {},
    tableQueryString: '',
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

export const Explorer = injectI18n(injectObservablesAsProps(
  {
    annotationsRefresh: annotationsRefresh$,
    explorer: explorer$,
    showCharts: showCharts$,
    swimlaneLimit: limit$.pipe(map(d => d.val)),
    tableInterval: interval$.pipe(map(d => d.val)),
    tableSeverity: severity$.pipe(map(d => d.val)),
  },
  class Explorer extends React.Component {
    static propTypes = {
      appStateHandler: PropTypes.func.isRequired,
      dateFormatTz: PropTypes.string.isRequired,
      MlTimeBuckets: PropTypes.func.isRequired,
    };

    state = getExplorerDefaultState();

    // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
    disableDragSelectOnMouseLeave = true;
    // skip listening to clicks on swimlanes while they are loading to avoid race conditions
    skipCellClicks = true;

    // initialize an empty callback, this will be set in componentDidMount()
    updateCharts = () => {};

    dragSelect = new DragSelect({
      selectables: document.getElementsByClassName('sl-cell'),
      callback(elements) {
        if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
          elements = [elements[0]];
        }

        if (elements.length > 0) {
          dragSelect$.next({
            action: DRAG_SELECT_ACTION.NEW_SELECTION,
            elements
          });
        }

        this.disableDragSelectOnMouseLeave = true;
      },
      onDragStart() {
        if (ALLOW_CELL_RANGE_SELECTION) {
          dragSelect$.next({
            action: DRAG_SELECT_ACTION.DRAG_START
          });
          this.disableDragSelectOnMouseLeave = false;
        }
      },
      onElementSelect() {
        if (ALLOW_CELL_RANGE_SELECTION) {
          dragSelect$.next({
            action: DRAG_SELECT_ACTION.ELEMENT_SELECT
          });
        }
      }
    });

    // Listens to render updates of the swimlanes to update dragSelect
    swimlaneRenderDoneListener = () => {
      this.dragSelect.clearSelection();
      this.dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
    };

    componentDidMount() {
      this.updateCharts = explorerChartsContainerServiceFactory((data) => {
        this.setState({
          chartsData: {
            ...getDefaultChartsData(),
            chartsPerRow: data.chartsPerRow,
            seriesToPlot: data.seriesToPlot,
            // convert truthy/falsy value to Boolean
            tooManyBuckets: !!data.tooManyBuckets,
          }
        });
      });
    }

    // based on the pattern described here:
    // https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html#fetching-external-data-when-props-change
    // instead of our previous approach using custom listeners, here we react to prop changes
    // and trigger corresponding updates to the component's state via updateExplorer()
    previousSwimlaneLimit = limit$.getValue().val;
    previousTableInterval = interval$.getValue().val;
    previousTableSeverity = severity$.getValue().val;
    async componentDidUpdate() {
      if (this.props.explorer !== undefined && this.props.explorer.action !== EXPLORER_ACTION.IDLE) {
        explorer$.next({ action: EXPLORER_ACTION.IDLE });

        const { action, payload } = this.props.explorer;

        if (action === EXPLORER_ACTION.INITIALIZE) {
          const { noJobsFound, selectedCells, selectedJobs, swimlaneViewByFieldName, filterData } = payload;
          let currentSelectedCells = this.state.selectedCells;
          let currentSwimlaneViewByFieldName = this.state.swimlaneViewByFieldName;

          if (swimlaneViewByFieldName !== undefined) {
            currentSwimlaneViewByFieldName = swimlaneViewByFieldName;
          }

          if (selectedCells !== undefined && currentSelectedCells === null) {
            currentSelectedCells = selectedCells;
          }

          const stateUpdate = {
            noInfluencersConfigured: (getInfluencers(selectedJobs).length === 0),
            noJobsFound,
            selectedCells: currentSelectedCells,
            selectedJobs,
            swimlaneViewByFieldName: currentSwimlaneViewByFieldName
          };

          if (filterData.influencersFilterQuery !== undefined) {
            Object.assign(stateUpdate, { ...filterData });
          }

          const indexPattern = await this.getIndexPattern(selectedJobs);
          stateUpdate.indexPattern = indexPattern;

          this.updateExplorer(stateUpdate, true);
        }

        // Listen for changes to job selection.
        if (action === EXPLORER_ACTION.JOB_SELECTION_CHANGE) {
          const { selectedJobs } = payload;
          const stateUpdate = {
            noInfluencersConfigured: (getInfluencers(selectedJobs).length === 0),
            selectedJobs,
          };

          this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
          Object.assign(stateUpdate, getClearedSelectedAnomaliesState());
          // clear filter if selected jobs have no influencers
          if (stateUpdate.noInfluencersConfigured === true) {
            this.props.appStateHandler(APP_STATE_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS);
            const noFilterState = {
              filterActive: false,
              filteredFields: [],
              influencersFilterQuery: undefined,
              maskAll: false,
              queryString: '',
              tableQueryString: ''
            };

            Object.assign(stateUpdate, noFilterState);
          } else {
            // indexPattern will not be used if there are no influencers so set up can be skipped
            // indexPattern is passed to KqlFilterBar which is only shown if (noInfluencersConfigured === false)
            const indexPattern = await this.getIndexPattern(selectedJobs);
            stateUpdate.indexPattern = indexPattern;
          }

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
      } else if (this.previousSwimlaneLimit !== this.props.swimlaneLimit) {
        this.previousSwimlaneLimit = this.props.swimlaneLimit;
        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
        this.updateExplorer(getClearedSelectedAnomaliesState(), false);
      } else if (this.previousTableInterval !== this.props.tableInterval) {
        this.previousTableInterval = this.props.tableInterval;
        this.updateExplorer();
      } else if (this.previousTableSeverity !== this.props.tableSeverity) {
        this.previousTableSeverity = this.props.tableSeverity;
        this.updateExplorer();
      } else if (this.props.annotationsRefresh === true) {
        annotationsRefresh$.next(false);
        // clear the annotations cache and trigger an update
        this.annotationsTablePreviousArgs = null;
        this.annotationsTablePreviousData = null;
        this.updateExplorer();
      }
    }

    // Creates index pattern in the format expected by the kuery bar/kuery autocomplete provider
    // Field objects required fields: name, type, aggregatable, searchable
    async getIndexPattern(selectedJobs) {
      const { indexPattern } = this.state;
      const influencers = getInfluencers(selectedJobs);

      indexPattern.fields = influencers.map((influencer) => ({
        name: influencer,
        type: 'string',
        aggregatable: true,
        searchable: true
      }));

      return indexPattern;
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
          this.loadOverallDataPreviousArgs = compareArgs;
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
    loadViewBySwimlane(fieldValues, overallSwimlaneData, selectedJobs, swimlaneViewByFieldName, influencersFilterQuery) {
      const { swimlaneLimit } = this.props;

      const compareArgs = {
        fieldValues,
        overallSwimlaneData,
        selectedJobs,
        swimlaneLimit,
        swimlaneViewByFieldName,
        interval: this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        influencersFilterQuery
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
              swimlaneLimit,
              influencersFilterQuery
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
      const { swimlaneLimit } = this.props;

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
    async updateExplorer(stateUpdate = {}, showOverallLoadingIndicator = true) {
      const {
        filterActive,
        filteredFields,
        influencersFilterQuery,
        isAndOperator,
        noInfluencersConfigured,
        noJobsFound,
        selectedCells,
        selectedJobs,
        swimlaneViewByFieldName,
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

      const viewBySwimlaneOptions = getViewBySwimlaneOptions({
        currentSwimlaneViewByFieldName: swimlaneViewByFieldName,
        filterActive,
        filteredFields,
        isAndOperator,
        selectedJobs,
        selectedCells
      });

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
            viewBySwimlaneOptions.swimlaneViewByFieldName,
            influencersFilterQuery
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
            viewBySwimlaneOptions.swimlaneViewByFieldName,
            influencersFilterQuery
          ),
        );
      }

      const { viewBySwimlaneData } = stateUpdate;

      // do a sanity check against selectedCells. It can happen that a previously
      // selected lane loaded via URL/AppState is not available anymore.
      // If filter is active - selectedCell may not be available due to swimlane view by change to filter fieldName
      // Ok to keep cellSelection in this case
      let clearSelection = false;
      if (
        selectedCells !== null &&
        selectedCells.type === SWIMLANE_TYPE.VIEW_BY
      ) {
        clearSelection = (filterActive === false) && !selectedCells.lanes.some((lane) => {
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

      if (stateUpdate.influencers !== undefined && !noInfluencersConfigured) {
        for (const influencerName in stateUpdate.influencers) {
          if (stateUpdate.influencers[influencerName][0] && stateUpdate.influencers[influencerName][0].influencerFieldValue) {
            stateUpdate.filterPlaceHolder = `${influencerName} : ${stateUpdate.influencers[influencerName][0].influencerFieldValue}`;
            break;
          }
        }
      }

      const updatedAnomalyChartRecords = await loadDataForCharts(
        jobIds, timerange.earliestMs, timerange.latestMs, selectionInfluencers, selectedCells, influencersFilterQuery
      );

      if ((selectionInfluencers.length > 0 || influencersFilterQuery !== undefined) && updatedAnomalyChartRecords !== undefined) {
        stateUpdate.influencers = await getFilteredTopInfluencers(
          jobIds,
          timerange.earliestMs,
          timerange.latestMs,
          updatedAnomalyChartRecords,
          selectionInfluencers,
          noInfluencersConfigured,
          influencersFilterQuery
        );
      }

      stateUpdate.anomalyChartRecords = updatedAnomalyChartRecords || [];

      this.setState(stateUpdate);

      if (selectedCells !== null) {
        this.updateCharts(
          stateUpdate.anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      } else {
        this.updateCharts(
          [], timerange.earliestMs, timerange.latestMs
        );
      }

      const { tableInterval, tableSeverity } = this.props;
      const anomaliesTableCompareArgs = {
        selectedCells,
        selectedJobs,
        dateFormatTz,
        interval: this.getSwimlaneBucketInterval(selectedJobs).asSeconds(),
        boundsMin: bounds.min.valueOf(),
        boundsMax: bounds.max.valueOf(),
        swimlaneViewByFieldName: viewBySwimlaneOptions.swimlaneViewByFieldName,
        tableInterval,
        tableSeverity,
        influencersFilterQuery
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
          viewBySwimlaneOptions.swimlaneViewByFieldName,
          tableInterval,
          tableSeverity,
          influencersFilterQuery
        );
        this.setState({ tableData });
      }
    }

    viewByChangeHandler = e => this.setSwimlaneViewBy(e.target.value);
    setSwimlaneViewBy = (swimlaneViewByFieldName) => {
      let maskAll = false;

      if (this.state.influencersFilterQuery !== undefined) {
        maskAll = (swimlaneViewByFieldName === VIEW_BY_JOB_LABEL ||
          this.state.filteredFields.includes(swimlaneViewByFieldName) === false);
      }

      this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
      this.props.appStateHandler(APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME, { swimlaneViewByFieldName });
      this.setState({ swimlaneViewByFieldName, maskAll }, () => {
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
    // Escape regular parens from fieldName as that portion of the query is not wrapped in double quotes
    // and will cause a syntax error when called with getKqlQueryValues
    applyFilter = (fieldName, fieldValue, action) => {
      let newQueryString = '';
      const { queryString } = this.state;
      const operator = 'and ';
      const sanitizedFieldName = escapeParens(fieldName);
      const sanitizedFieldValue = escapeDoubleQuotes(fieldValue);

      if (action === FILTER_ACTION.ADD) {
        // Don't re-add if already exists in the query
        const queryPattern = getQueryPattern(fieldName, fieldValue);
        if (queryString.match(queryPattern) !== null) {
          return;
        }
        newQueryString = `${queryString ? `${queryString} ${operator}` : ''}${sanitizedFieldName}:"${sanitizedFieldValue}"`;
      } else if (action === FILTER_ACTION.REMOVE) {
        if (this.state.filterActive === false) {
          return;
        } else {
          newQueryString = removeFilterFromQueryString(this.state.queryString, sanitizedFieldName, sanitizedFieldValue);
        }
      }

      try {
        const queryValues = getKqlQueryValues(`${newQueryString}`, this.state.indexPattern);
        this.applyInfluencersFilterQuery(queryValues);
      } catch(e) {
        console.log('Invalid kuery syntax', e); // eslint-disable-line no-console

        toastNotifications.addDanger(this.props.intl.formatMessage({
          id: 'xpack.ml.explorer.invalidKuerySyntaxErrorMessageFromTable',
          defaultMessage: 'Invalid syntax in query bar. The input must be valid Kibana Query Language (KQL)'
        }));
      }
    }

    applyInfluencersFilterQuery = ({
      influencersFilterQuery,
      isAndOperator,
      filteredFields,
      queryString,
      tableQueryString }) => {
      const { selectedCells, swimlaneViewByFieldName, viewBySwimlaneOptions } = this.state;
      let selectedViewByFieldName = swimlaneViewByFieldName;

      if (influencersFilterQuery.match_all && Object.keys(influencersFilterQuery.match_all).length === 0) {
        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS);
        this.props.appStateHandler(APP_STATE_ACTION.CLEAR_SELECTION);
        const stateUpdate = {
          filterActive: false,
          filteredFields: [],
          influencersFilterQuery: undefined,
          isAndOperator: false,
          maskAll: false,
          queryString: '',
          tableQueryString: '',
          ...getClearedSelectedAnomaliesState()
        };

        this.updateExplorer(stateUpdate, false);
      } else {
        // if it's an AND filter set view by swimlane to job ID as the others will have no results
        if (isAndOperator && selectedCells === null) {
          selectedViewByFieldName = VIEW_BY_JOB_LABEL;
          this.props.appStateHandler(
            APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
            { swimlaneViewByFieldName: selectedViewByFieldName },
          );
        } else {
        // Set View by dropdown to first relevant fieldName based on incoming filter if there's no cell selection already
        // or if selected cell is from overall swimlane as this won't include an additional influencer filter
          for (let i = 0; i < filteredFields.length; i++) {
            if (viewBySwimlaneOptions.includes(filteredFields[i]) &&
                ((selectedCells === null || (selectedCells && selectedCells.type === 'overall')))) {
              selectedViewByFieldName = filteredFields[i];
              this.props.appStateHandler(
                APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME,
                { swimlaneViewByFieldName: selectedViewByFieldName },
              );
              break;
            }
          }
        }

        this.props.appStateHandler(APP_STATE_ACTION.SAVE_INFLUENCER_FILTER_SETTINGS,
          { influencersFilterQuery, filterActive: true, filteredFields, queryString, tableQueryString, isAndOperator });

        this.updateExplorer({
          filterActive: true,
          filteredFields,
          influencersFilterQuery,
          isAndOperator,
          queryString,
          tableQueryString,
          maskAll: (selectedViewByFieldName === VIEW_BY_JOB_LABEL ||
            filteredFields.includes(selectedViewByFieldName) === false),
          swimlaneViewByFieldName: selectedViewByFieldName
        }, false);
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
        filterActive,
        filterPlaceHolder,
        indexPattern,
        maskAll,
        influencers,
        hasResults,
        noInfluencersConfigured,
        noJobsFound,
        overallSwimlaneData,
        queryString,
        selectedCells,
        swimlaneViewByFieldName,
        tableData,
        tableQueryString,
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

          {noInfluencersConfigured === false &&
            influencers !== undefined &&
            <div className="mlAnomalyExplorer__filterBar">
              <KqlFilterBar
                indexPattern={indexPattern}
                onSubmit={this.applyInfluencersFilterQuery}
                initialValue={queryString}
                placeholder={filterPlaceHolder}
                valueExternal={tableQueryString}
              />
            </div>}

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
              <InfluencersList
                influencers={influencers}
                influencerFilter={this.applyFilter}
              />
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
                filterActive={filterActive}
                maskAll={maskAll}
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
                        {filterActive === true &&
                          swimlaneViewByFieldName === 'job ID' && (
                          <FormattedMessage
                            id="xpack.ml.explorer.jobScoreAcrossAllInfluencersLabel"
                            defaultMessage="(Job score across all influencers)"
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
                      filterActive={filterActive}
                      maskAll={maskAll}
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
                  <ExplorerNoInfluencersFound
                    swimlaneViewByFieldName={swimlaneViewByFieldName}
                    showFilterMessage={(filterActive === true)}
                  />
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
                <AnnotationFlyout />
                <EuiSpacer size="l" />
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
              {(anomalyChartRecords.length > 0 && selectedCells !== null) && (
                <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
                  <EuiFormRow label="&#8203;">
                    <CheckboxShowCharts />
                  </EuiFormRow>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <div className="euiText explorer-charts">
              {this.props.showCharts && <ExplorerChartsContainer {...chartsData} />}
            </div>

            <AnomaliesTable
              tableData={tableData}
              timefilter={timefilter}
              influencerFilter={this.applyFilter}
            />
          </div>
        </div>
      );
    }
  }
));
