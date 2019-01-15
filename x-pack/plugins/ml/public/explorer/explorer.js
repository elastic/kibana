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
import { TimeBuckets } from 'ui/time_buckets';

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
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { LoadingIndicator } from '../components/loading_indicator/loading_indicator';
import { CheckboxShowCharts, mlCheckboxShowChartsService } from '../components/controls/checkbox_showcharts/checkbox_showcharts';
import { SelectInterval, mlSelectIntervalService } from '../components/controls/select_interval/select_interval';
import { SelectLimit, mlSelectLimitService } from './select_limit/select_limit';
import { SelectSeverity, mlSelectSeverityService } from '../components/controls/select_severity/select_severity';

import {
  getFilteredTopInfluencers,
  getSelectionInfluencers,
  getSelectionTimeRange,
  getSelectedJobs,
  getSelectedJobIds,
  getSwimlaneBucketInterval,
  getDefaultViewBySwimlaneData,
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
    overallSwimlaneData: [],
    selectedCells: null,
    selectedJobs: null,
    swimlaneViewByFieldName: null,
    swimlaneWidth: getSwimlaneContainerWidth(),
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
      jobs: PropTypes.array,
      loading: PropTypes.bool,
    };

    state = getExplorerDefaultState();

    // make sure dragSelect is only available if the mouse pointer is actually over a swimlane
    disableDragSelectOnMouseLeave = true;
    // skip listening to clicks on swimlanes while they are loading to avoid race conditions
    skipCellClicks = true;

    updateCharts = explorerChartsContainerServiceFactory((data) => {
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

    dashboardListener = (async (action, payload) => {
      // Listen to the initial loading of jobs
      if (action === EXPLORER_ACTION.INITIALIZE) {
        const {
          appState,
          jobs,
          mlJobSelectService
        } = this.props;
        // Select any jobs set in the global state (i.e. passed in the URL).
        const selectedJobIds = mlJobSelectService.getSelectedJobIds(true);

        const selectedJobs = await getSelectedJobs(this.state.selectedJobs, jobs, selectedJobIds, appState);
        this.setState(
          {
            noInfluencersConfigured: !selectedJobsHaveInfluencers(selectedJobs),
            selectedJobs
          },
          async () => {
            // Load the data - if the FieldFormats failed to populate
            // the default formatting will be used for metric values.
            await this.loadOverallData();
            this.loadViewBySwimlane([]);

            let selectedCells = this.state.selectedCells;

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
              this.setState(
                {
                  selectedCells,
                  swimlaneViewByFieldName: appState.mlExplorerSwimlane.viewBy,
                },
                () => {
                  this.updateExplorer();
                }
              );
            } else {
              this.updateExplorer();
            }
          }
        );
      }

      // Listen for changes to job selection.
      if (action === EXPLORER_ACTION.JOB_SELECTION_CHANGE) {
        const { jobs, selections } = payload;
        const { selectedJobs } = this.state;
        this.clearSwimlaneSelectionFromAppState();
        const updatedSelectedJobs = await getSelectedJobs(selectedJobs, jobs, selections, this.props.appState);
        this.setState(
          {
            noInfluencersConfigured: !selectedJobsHaveInfluencers(updatedSelectedJobs),
            selectedJobs: updatedSelectedJobs,
          },
          async () => {
            // Load the data - if the FieldFormats failed to populate
            // the default formatting will be used for metric values.
            await this.loadOverallData();
            this.loadViewBySwimlane([]);
            this.clearSelectedAnomalies();
          }
        );
      }

      if (action === EXPLORER_ACTION.REFRESH) {
        await this.loadOverallData();
        this.loadViewBySwimlane([]);
        this.clearSelectedAnomalies();
      }

      if (action === EXPLORER_ACTION.REDRAW) {
        if (
          mlCheckboxShowChartsService.state.get('showCharts') &&
          this.state.anomalyChartRecords.length > 0
        ) {
          const swimlaneWidth = getSwimlaneContainerWidth(this.state.noInfluencersConfigured);
          const timerange = getSelectionTimeRange(
            this.state.selectedCells,
            getSwimlaneBucketInterval(this.props.jobs, swimlaneWidth).asSeconds()
          );
          this.updateCharts(this.state.anomalyChartRecords, timerange.earliestMs, timerange.latestMs);
        }
      }
    });

    checkboxShowChartsListener = () => {
      const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
      const { jobs } = this.props;
      const { noInfluencersConfigured, selectedCells } = this.state;
      if (showCharts && selectedCells !== null) {
        this.updateExplorer();
      } else {
        const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);
        const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds());
        this.updateCharts(
          [], timerange.earliestMs, timerange.latestMs
        );
      }
    };

    anomalyChartsSeverityListener = () => {
      const showCharts = mlCheckboxShowChartsService.state.get('showCharts');
      const { jobs } = this.props;
      const { anomalyChartRecords, noInfluencersConfigured, selectedCells } = this.state;
      if (showCharts && selectedCells !== null) {
        const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);
        const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds());
        this.updateCharts(
          anomalyChartRecords, timerange.earliestMs, timerange.latestMs
        );
      }
    };

    tableControlsListener = async () => {
      const { dateFormatTz, jobs } = this.props;
      const { noInfluencersConfigured, selectedCells, swimlaneViewByFieldName } = this.state;
      const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);
      this.setState({
        tableData: await loadAnomaliesTableData(
          selectedCells,
          jobs,
          dateFormatTz,
          getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds(),
          swimlaneViewByFieldName
        )
      });
    };

    swimlaneLimitListener = () => {
      this.loadViewBySwimlane([]);
      this.clearSelectedAnomalies();
    };

    // Listens to render updates of the swimlanes to update dragSelect
    swimlaneRenderDoneListener = () => {
      this.dragSelect.clearSelection();
      this.dragSelect.setSelectables(document.getElementsByClassName('sl-cell'));
    };

    componentDidMount() {
      mlExplorerDashboardService.explorer.watch(this.dashboardListener);
      mlCheckboxShowChartsService.state.watch(this.checkboxShowChartsListener);
      mlSelectSeverityService.state.watch(this.anomalyChartsSeverityListener);
      mlSelectIntervalService.state.watch(this.tableControlsListener);
      mlSelectSeverityService.state.watch(this.tableControlsListener);
      mlExplorerDashboardService.swimlaneRenderDone.watch(this.swimlaneRenderDoneListener);
    }

    componentWillUnmount() {
      mlExplorerDashboardService.explorer.unwatch(this.dashboardListener);
      mlCheckboxShowChartsService.state.unwatch(this.checkboxShowChartsListener);
      mlSelectSeverityService.state.unwatch(this.anomalyChartsSeverityListener);
      mlSelectIntervalService.state.unwatch(this.tableControlsListener);
      mlSelectSeverityService.state.unwatch(this.tableControlsListener);
      mlExplorerDashboardService.swimlaneRenderDone.unwatch(this.swimlaneRenderDoneListener);
    }

    async loadOverallData() {
      return new Promise((resolve) => {
        // Loads the overall data components i.e. the overall swimlane and influencers list.
        if (this.state.selectedJobs === null) {
          resolve();
        }

        this.setState(
          {
            hasResults: false,
            loading: true,
          },
          () => {
            const swimlaneWidth = getSwimlaneContainerWidth(this.state.noInfluencersConfigured);

            // Ensure the search bounds align to the bucketing interval used in the swimlane so
            // that the first and last buckets are complete.
            const bounds = timefilter.getActiveBounds();
            const searchBounds = getBoundsRoundedToInterval(
              bounds,
              getSwimlaneBucketInterval(this.props.jobs, swimlaneWidth),
              false
            );
            const selectedJobIds = getSelectedJobIds(this.props.jobs);

            // Load the overall bucket scores by time.
            // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
            // which wouldn't be the case if e.g. '1M' was used.
            // Pass 'true' when obtaining bucket bounds due to the way the overall_buckets endpoint works
            // to ensure the search is inclusive of end time.
            const overallBucketsBounds = getBoundsRoundedToInterval(
              bounds,
              getSwimlaneBucketInterval(this.props.jobs, swimlaneWidth),
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
              getSwimlaneBucketInterval(this.props.jobs, swimlaneWidth).asSeconds() + 's'
            ).then((resp) => {
              this.skipCellClicks = false;
              const overallSwimlaneData = processOverallResults(
                resp.results,
                searchBounds,
                this.props.jobs,
                swimlaneWidth
              );

              console.log('Explorer overall swimlane data set:', overallSwimlaneData);
              const hasResults = (overallSwimlaneData.points && overallSwimlaneData.points.length > 0);
              this.setState(
                {
                  hasResults,
                  loading: false,
                  overallSwimlaneData,
                },
                () => {
                  if (this.state.hasResults) {
                    // Trigger loading of the 'view by' swimlane -
                    // only load once the overall swimlane so that we can match the time span.
                    this.setViewBySwimlaneOptions(resolve);
                  } else {
                    resolve();
                  }
                }
              );
            });
          }
        );
      });
    }

    setViewBySwimlaneOptions(resolve) {
      // Obtain the list of 'View by' fields per job.
      this.setState(
        { swimlaneViewByFieldName: '' },
        () => {
          // Unique influencers for the selected job(s).
          let viewByOptions = [];

          const selectedJobIds = getSelectedJobIds(this.props.jobs);
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

          // Currently unused but may be used if add in view by detector.
          // $scope.fieldsByJob = fieldsByJob;
          viewByOptions = _.chain(viewByOptions).uniq().sortBy(fieldName => fieldName.toLowerCase()).value();
          viewByOptions.push(VIEW_BY_JOB_LABEL);
          const viewBySwimlaneOptions = viewByOptions;

          let swimlaneViewByFieldName = null;

          if (this.props.appState.mlExplorerSwimlane.viewBy !== undefined &&
            this.state.viewBySwimlaneOptions.indexOf(this.props.appState.mlExplorerSwimlane.viewBy) !== -1) {
            // Set the swimlane viewBy to that stored in the state (URL) if set.
            swimlaneViewByFieldName = this.props.appState.mlExplorerSwimlane.viewBy;
          } else {
            if (selectedJobIds.length > 1) {
              // If more than one job selected, default to job ID.
              swimlaneViewByFieldName = VIEW_BY_JOB_LABEL;
            } else {
              // For a single job, default to the first partition, over,
              // by or influencer field of the first selected job.
              const firstSelectedJob = _.find(mlJobService.jobs, (job) => {
                return job.job_id === selectedJobIds[0];
              });

              const firstJobInfluencers = firstSelectedJob.analysis_config.influencers || [];
              _.each(firstSelectedJob.analysis_config.detectors, (detector) => {
                if (
                  _.has(detector, 'partition_field_name') &&
                  firstJobInfluencers.indexOf(detector.partition_field_name) !== -1
                ) {
                  swimlaneViewByFieldName = detector.partition_field_name;
                  return false;
                }

                if (
                  _.has(detector, 'over_field_name') &&
                  firstJobInfluencers.indexOf(detector.over_field_name) !== -1
                ) {
                  swimlaneViewByFieldName = detector.over_field_name;
                  return false;
                }

                // For jobs with by and over fields, don't add the 'by' field as this
                // field will only be added to the top-level fields for record type results
                // if it also an influencer over the bucket.
                if (_.has(detector, 'by_field_name') && !(_.has(detector, 'over_field_name')) &&
                    firstJobInfluencers.indexOf(detector.by_field_name) !== -1) {
                  swimlaneViewByFieldName = detector.by_field_name;
                  return false;
                }
              });

              if (this.state.swimlaneViewByFieldName === null) {
                if (firstJobInfluencers.length > 0) {
                  swimlaneViewByFieldName = firstJobInfluencers[0];
                } else {
                  // No influencers for first selected job - set to first available option.
                  swimlaneViewByFieldName = this.state.viewBySwimlaneOptions.length > 0 ? this.state.viewBySwimlaneOptions[0] : null;
                }
              }
            }

            this.props.appState.fetch();
            this.props.appState.mlExplorerSwimlane.viewBy = swimlaneViewByFieldName;
            this.props.appState.save();
          }

          this.setState(
            {
              swimlaneViewByFieldName,
              viewBySwimlaneOptions,
            },
            () => resolve()
          );
        }
      );
    }

    loadViewBySwimlane(fieldValues) {
      const { jobs } = this.props;

      const {
        noInfluencersConfigured,
        overallSwimlaneData,
        selectedCells,
        selectedJobs,
        swimlaneViewByFieldName,
        viewBySwimlaneData,
      } = this.state;

      const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);

      // reset the swimlane data to avoid flickering where the old dataset would briefly show up.
      this.setState(
        {
          viewBySwimlaneData: getDefaultViewBySwimlaneData(),
          viewBySwimlaneDataLoading: true,
        },
        () => {
          this.skipCellClicks = true;

          const finishCallback = () => {
            this.setState(
              { viewBySwimlaneDataLoading: false },
              () => {
                this.skipCellClicks = false;
                console.log('Explorer view by swimlane data set:', viewBySwimlaneData);
                if (this.swimlaneCellClickQueue.length > 0) {
                  const latestSelectedCells = this.swimlaneCellClickQueue.pop();
                  this.swimlaneCellClickQueue.length = 0;
                  this.swimlaneCellClick(latestSelectedCells);
                  return;
                }
              }
            );
          };

          const finish = (resp) => {
            if (resp !== undefined) {
              this.setState(
                {
                  viewBySwimlaneData: processViewByResults(
                    resp.results,
                    fieldValues,
                    jobs,
                    overallSwimlaneData,
                    swimlaneViewByFieldName,
                    swimlaneWidth
                  )
                },
                () => {
                  // do a sanity check against selectedCells. It can happen that a previously
                  // selected lane loaded via URL/AppState is not available anymore.
                  if (
                    selectedCells !== null &&
                    selectedCells.type === SWIMLANE_TYPE.VIEW_BY
                  ) {
                    const selectionExists = selectedCells.lanes.some((lane) => {
                      return (viewBySwimlaneData.laneLabels.includes(lane));
                    });
                    if (selectionExists === false) {
                      this.clearSelectedAnomalies();
                    }
                  }

                  finishCallback();
                }
              );
            } else {
              finishCallback();
            }
          };

          if (
            selectedJobs === undefined ||
            swimlaneViewByFieldName === undefined  ||
            swimlaneViewByFieldName === null
          ) {
            finish();
            return;
          } else {
            // Ensure the search bounds align to the bucketing interval used in the swimlane so
            // that the first and last buckets are complete.
            const bounds = timefilter.getActiveBounds();
            const searchBounds = getBoundsRoundedToInterval(bounds, getSwimlaneBucketInterval(jobs, swimlaneWidth), false);
            const selectedJobIds = getSelectedJobIds(jobs);
            const limit = mlSelectLimitService.state.get('limit');
            const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

            // load scores by influencer/jobId value and time.
            // Pass the interval in seconds as the swimlane relies on a fixed number of seconds between buckets
            // which wouldn't be the case if e.g. '1M' was used.
            const interval = getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds() + 's';
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
        }
      );
    }

    loadViewBySwimlaneForSelectedTime(earliestMs, latestMs) {
      const { jobs } = this.props;
      const { noInfluencersConfigured, swimlaneViewByFieldName } = this.state;

      const selectedJobIds = getSelectedJobIds(jobs);
      const limit = mlSelectLimitService.state.get('limit');
      const swimlaneLimit = (limit === undefined) ? SWIMLANE_DEFAULT_LIMIT : limit.val;

      // Find the top field values for the selected time, and then load the 'view by'
      // swimlane over the full time range for those specific field values.
      if (swimlaneViewByFieldName !== VIEW_BY_JOB_LABEL) {
        mlResultsService.getTopInfluencers(
          selectedJobIds,
          earliestMs,
          latestMs,
          swimlaneLimit
        ).then((resp) => {
          const topFieldValues = [];
          const topInfluencers = resp.influencers[swimlaneViewByFieldName];
          _.each(topInfluencers, (influencerData) => {
            if (influencerData.maxAnomalyScore > 0) {
              topFieldValues.push(influencerData.influencerFieldValue);
            }
          });
          this.loadViewBySwimlane(topFieldValues);
        });
      } else {
        const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);
        mlResultsService.getScoresByBucket(
          selectedJobIds,
          earliestMs,
          latestMs,
          getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds() + 's',
          swimlaneLimit
        ).then((resp) => {
          this.loadViewBySwimlane(_.keys(resp.results));
        });
      }
    }

    async updateExplorer() {
      const {
        anomalyChartRecords,
        noInfluencersConfigured,
        selectedCells,
        swimlaneViewByFieldName,
      } = this.state;

      const {
        dateFormatTz,
        jobs
      } = this.props;

      const swimlaneWidth = getSwimlaneContainerWidth(noInfluencersConfigured);

      const jobIds = (selectedCells !== null && selectedCells.fieldName === VIEW_BY_JOB_LABEL)
        ? selectedCells.lanes
        : getSelectedJobIds(jobs);

      const timerange = getSelectionTimeRange(selectedCells, getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds());
      const selectionInfluencers = getSelectionInfluencers(selectedCells, swimlaneViewByFieldName);

      this.setState(
        {
          annotationsData: await loadAnnotationsTableData(
            selectedCells, jobs, getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds()
          )
        },
        async () => {
          this.updateCharts(anomalyChartRecords || [], timerange.earliestMs, timerange.latestMs);

          if (selectedCells !== null && selectedCells.fieldName === undefined) {
            // Click is in one of the cells in the Overall swimlane - reload the 'view by' swimlane
            // to show the top 'view by' values for the selected time.
            this.loadViewBySwimlaneForSelectedTime(timerange.earliestMs, timerange.latestMs);
            this.setState(
              { viewByLoadedForTimeFormatted: formatHumanReadableDateTime(timerange.earliestMs) }
            );
          }

          let influencers;

          if (selectionInfluencers.length === 0) {
            influencers = await loadTopInfluencers(jobIds, timerange.earliestMs, timerange.latestMs, noInfluencersConfigured);
          }

          const updatedAnomalyChartRecords = await loadDataForCharts(
            jobIds, timerange.earliestMs, timerange.latestMs, selectionInfluencers, selectedCells
          );

          if (selectionInfluencers.length > 0 && updatedAnomalyChartRecords !== undefined) {
            influencers = await getFilteredTopInfluencers(
              jobIds,
              timerange.earliestMs,
              timerange.latestMs,
              updatedAnomalyChartRecords,
              selectionInfluencers,
              noInfluencersConfigured,
            );
          }

          if (updatedAnomalyChartRecords !== undefined) {
            this.setState({ anomalyChartRecords: updatedAnomalyChartRecords });

            if (mlCheckboxShowChartsService.state.get('showCharts')) {
              this.updateCharts(
                updatedAnomalyChartRecords, timerange.earliestMs, timerange.latestMs
              );
            }
          }

          this.setState({
            influencers,
            tableData: await loadAnomaliesTableData(
              selectedCells,
              jobs,
              dateFormatTz,
              getSwimlaneBucketInterval(jobs, swimlaneWidth).asSeconds(),
              swimlaneViewByFieldName
            )
          });
        }
      );

    }

    clearSwimlaneSelectionFromAppState() {
      const { appState } = this.props;
      appState.fetch();
      delete appState.mlExplorerSwimlane.selectedType;
      delete appState.mlExplorerSwimlane.selectedLanes;
      delete appState.mlExplorerSwimlane.selectedTimes;
      appState.save();
    }

    clearSelectedAnomalies() {
      this.setState({
        anomalyChartRecords: [],
        selectedCells: null,
        viewByLoadedForTimeFormatted: null,
      });
      this.clearSwimlaneSelectionFromAppState();
      this.updateExplorer();
    }

    viewByChangeHandler = e => this.setSwimlaneViewBy(e.target.value);
    setSwimlaneViewBy = (swimlaneViewByFieldName) => {
      this.setState(
        { swimlaneViewByFieldName },
        () => {
          // Save the 'view by' field name to the AppState so that it can restored from the URL.
          this.props.appState.fetch();
          this.props.appState.mlExplorerSwimlane.viewBy = swimlaneViewByFieldName;
          this.props.appState.save();

          this.loadViewBySwimlane([]);
          this.clearSelectedAnomalies();
        }
      );
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
      if (_.keys(swimlaneSelectedCells).length === 0) {
        if (this.state.viewByLoadedForTimeFormatted) {
          // Reload 'view by' swimlane over full time range.
          this.loadViewBySwimlane([]);
        }
        this.clearSelectedAnomalies();
      } else {
        this.props.appState.fetch();
        this.props.appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
        this.props.appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
        this.props.appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
        this.props.appState.save();
        this.setState({
          selectedCells: swimlaneSelectedCells
        });
        this.updateExplorer();
      }
    }

    render() {
      const {
        appState,
        intl,
        jobs,
      } = this.props;

      const {
        annotationsData,
        anomalyChartRecords,
        chartsData,
        influencers,
        hasResults,
        noInfluencersConfigured,
        overallSwimlaneData,
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

      if (jobs.length === 0) {
        return <ExplorerNoJobsFound />;
      }

      if (jobs.length > 0 && hasResults === false) {
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
                MlTimeBuckets={TimeBuckets}
                swimlaneCellClick={this.swimlaneCellClick}
                swimlaneData={overallSwimlaneData}
                swimlaneType={SWIMLANE_TYPE.OVERALL}
                selection={appState.mlExplorerSwimlane}
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
                      MlTimeBuckets={TimeBuckets}
                      swimlaneCellClick={this.swimlaneCellClick}
                      swimlaneData={viewBySwimlaneData}
                      swimlaneType={SWIMLANE_TYPE.VIEW_BY}
                      selection={appState.mlExplorerSwimlane}
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
