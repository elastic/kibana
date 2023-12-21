/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, createRef } from 'react';
import { isEqual } from 'lodash';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, tap, withLatestFrom } from 'rxjs/operators'; // map
import { EuiCheckbox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';
import { aggregationTypeTransform } from '@kbn/ml-anomaly-utils';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { Entity } from '../entity_control/entity_control';
import {
  type TimeseriesexplorerActionType,
  APP_STATE_ACTION,
  CHARTS_POINT_TARGET,
} from '../../timeseriesexplorer_constants';
import { mlTimeSeriesSearchService } from '../../timeseries_search_service';
import { mlForecastService } from '../../../services/forecast_service';
// TODO: Should mlJobService be passed in??
import { mlJobService } from '../../../services/job_service';
import { mlResultsService } from '../../../services/results_service';
import { isMetricDetector } from '../../get_function_description';
import {
  isModelPlotEnabled,
  isModelPlotChartableForDetector,
  isSourceDataChartableForDetector,
  mlFunctionToESAggregation,
} from '../../../../../common/util/job_utils';
import {
  calculateAggregationInterval,
  calculateDefaultFocusRange,
  calculateInitialFocusRange,
  createTimeSeriesJobData,
  processForecastResults,
  processMetricPlotResults,
  processRecordScoreResults,
  getFocusData,
} from '../../timeseriesexplorer_utils';
import { getBoundsRoundedToInterval } from '../../../util/time_buckets';
// import { getControlsForDetector } from '../../get_controls_for_detector';
import { TimeSeriesChartWithTooltips } from './timeseries_chart_with_tooltip';
import { LoadingIndicator } from '../../../components/loading_indicator/loading_indicator';
import { TimeseriesexplorerChartDataError } from '../timeseriesexplorer_chart_data_error';
import { TimeseriesexplorerNoChartData } from '../timeseriesexplorer_no_chart_data';

interface Selection {
  from: Date;
  to: Date;
}

interface State {
  chartDataError?: any; // TODO: update type
  chartDetails: any; // TODO: update type
  contextAggregationInterval: any; // TODO: update type
  contextChartData: any; // TODO: update type
  contextForecastData: any; // TODO: update type
  // Not chartable if e.g. model plot with terms for a varp detector
  dataNotChartable: boolean;
  focusAggregationInterval: any; // TODO: update type
  focusAnnotationData: any; // TODO: update type
  focusChartData: any; // TODO: update type
  focusForecastData: any; // TODO: update type
  fullRefresh: boolean;
  hasResults: boolean;
  loadCounter: number;
  loading: boolean;
  modelPlotEnabled: boolean;
  // Toggles display of annotations in the focus chart
  showAnnotations: boolean;
  showAnnotationsCheckbox: boolean;
  // Toggles display of forecast data in the focus chart
  showForecast: boolean;
  showForecastCheckbox: boolean;
  // Toggles display of model bounds in the focus chart
  showModelBounds: boolean;
  showModelBoundsCheckbox: boolean;
  svgWidth: number;
  swimlaneData: any; // TODO: update type
  zoomFrom?: Date;
  zoomTo?: Date;
  zoomFromFocusLoaded: any;
  zoomToFocusLoaded: any;
}

interface Props {
  appStateHandler: (action: TimeseriesexplorerActionType, payload: any) => void;
  arePartitioningFieldsProvided: boolean;
  autoZoomDuration: number;
  bounds: any; // TODO: update type
  entityControls: MlEntityField[];
  functionDescription: string;
  hasJobs: boolean;
  lastRefresh: number;
  loadAnomaliesTableData?: (from: number, to: number) => any; // TODO: update type
  previousRefresh: number;
  selectedDetectorIndex: number;
  selectedEntities: Record<string, any>;
  selectedJobId: string;
  selectedForecastId: string;
  toastNotificationService: any;
  zoom: any;
}

const containerPadding = 34;

export class TimeSeriesExplorerChart extends Component<Props, State> {
  public state: State = {
    chartDataError: undefined,
    chartDetails: undefined,
    contextAggregationInterval: undefined,
    contextChartData: undefined,
    contextForecastData: undefined,
    // Not chartable if e.g. model plot with terms for a varp detector
    dataNotChartable: false,
    focusAggregationInterval: {},
    focusAnnotationData: [],
    focusChartData: undefined,
    focusForecastData: undefined,
    fullRefresh: true,
    hasResults: false,
    loadCounter: 0,
    loading: false,
    modelPlotEnabled: false,
    showModelBounds: false,
    showAnnotations: false,
    showAnnotationsCheckbox: true,
    showForecast: false,
    showForecastCheckbox: false,
    showModelBoundsCheckbox: true,
    svgWidth: 0,
    swimlaneData: undefined,
    zoomFrom: undefined,
    zoomTo: undefined,
    zoomFromFocusLoaded: undefined,
    zoomToFocusLoaded: undefined,
  };

  subscriptions = new Subscription();
  resizeRef = createRef<{ offsetWidth: number }>();
  resizeChecker: typeof ResizeChecker | undefined = undefined;

  resizeHandler = () => {
    this.setState({
      svgWidth:
        this.resizeRef.current !== null ? this.resizeRef.current.offsetWidth - containerPadding : 0,
    });
  };
  unmounted = false;

  /**
   * Subject for listening brush time range selection.
   */
  contextChart$ = new Subject<Selection>();

  contextChartSelectedInitCallDone = false;
  previousSelectedForecastId = '';
  previousChartProps = {};
  previousShowAnnotations = undefined;
  previousShowForecast: boolean | undefined = undefined;
  previousShowModelBounds: boolean | undefined = undefined;

  displayErrorToastMessages = (error, errorMsg) => {
    if (this.props.toastNotificationService) {
      this.props.toastNotificationService.displayErrorToast(error, errorMsg, 2000);
    }
    this.setState({ loading: false, chartDataError: errorMsg });
  };

  getFocusAggregationInterval(selection: Selection) {
    const { selectedJobId } = this.props;
    const jobs = createTimeSeriesJobData(mlJobService.jobs);
    const selectedJob = mlJobService.getJob(selectedJobId);

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    return calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, jobs, selectedJob);
  }

  /**
   * Gets focus data for the current component state
   */
  getFocusData(selection: Selection) {
    const { selectedJobId, selectedForecastId, selectedDetectorIndex, functionDescription } =
      this.props;
    const { modelPlotEnabled } = this.state;
    const selectedJob = mlJobService.getJob(selectedJobId);
    if (isMetricDetector(selectedJob, selectedDetectorIndex) && functionDescription === undefined) {
      return;
    }
    const entityControls: MlEntityField[] = this.props.entityControls; // this.getControlsForDetector() as unknown as MlEntityField[];

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };
    const focusAggregationInterval = this.getFocusAggregationInterval(selection);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, focusAggregationInterval, false);

    return getFocusData(
      this.getCriteriaFields(selectedDetectorIndex, entityControls),
      selectedDetectorIndex,
      focusAggregationInterval,
      selectedForecastId,
      modelPlotEnabled,
      entityControls.filter((entity) => entity.fieldValue !== null),
      searchBounds,
      selectedJob,
      functionDescription
    );
  }

  contextChartSelected = (selection: Selection) => {
    const zoomState = {
      from: selection.from.toISOString(),
      to: selection.to.toISOString(),
    };

    if (
      isEqual(this.props.zoom, zoomState) &&
      this.state.focusChartData !== undefined &&
      this.props.previousRefresh === this.props.lastRefresh
    ) {
      return;
    }

    this.contextChart$.next(selection);
    this.props.appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);
  };

  /**
   * Updates local state of detector related controls from the global state.
   * @param callback to invoke after a state update.
   */
  // getControlsForDetector = () => {
  //   const { selectedDetectorIndex, selectedEntities, selectedJobId } = this.props;
  //   return getControlsForDetector(selectedDetectorIndex, selectedEntities, selectedJobId);
  // };

  /**
   * Updates criteria fields for API calls, e.g. getAnomaliesTableData
   * @param detectorIndex
   * @param entities
   */
  getCriteriaFields(detectorIndex: number, entities: MlEntityField[]) {
    // Only filter on the entity if the field has a value.
    const nonBlankEntities = entities.filter((entity: MlEntityField) => entity.fieldValue !== null);
    return [
      {
        fieldName: 'detector_index',
        fieldValue: detectorIndex,
      },
      ...nonBlankEntities,
    ];
  }

  /**
   * Returns field names that don't have a selection yet.
   */
  getFieldNamesWithEmptyValues = () => {
    const latestEntityControls = this.props.entityControls; //  this.getControlsForDetector();
    return latestEntityControls
      .filter(({ fieldValue }) => fieldValue === null)
      .map(({ fieldName }) => fieldName);
  };

  /**
   * Checks if all entity control dropdowns have a selection.
   */
  // arePartitioningFieldsProvided = () => {
  //   const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
  //   return fieldNamesWithEmptyValues.length === 0;
  // };

  loadSingleMetricData = (fullRefresh = true) => {
    const {
      autoZoomDuration,
      bounds,
      selectedDetectorIndex,
      selectedForecastId,
      selectedJobId,
      zoom,
      functionDescription,
    } = this.props;

    const { loadCounter: currentLoadCounter } = this.state;

    const currentSelectedJob = mlJobService.getJob(selectedJobId);
    if (currentSelectedJob === undefined) {
      return;
    }
    if (
      isMetricDetector(currentSelectedJob, selectedDetectorIndex) &&
      functionDescription === undefined
    ) {
      return;
    }

    const functionToPlotByIfMetric = aggregationTypeTransform.toES(functionDescription);

    this.contextChartSelectedInitCallDone = false;

    // Only when `fullRefresh` is true we'll reset all data
    // and show the loading spinner within the page.
    const entityControls = this.props.entityControls; // this.getControlsForDetector();
    this.setState(
      // @ts-ignore
      {
        fullRefresh,
        loadCounter: currentLoadCounter + 1,
        loading: true,
        chartDataError: undefined,
        ...(fullRefresh
          ? {
              chartDetails: undefined,
              contextChartData: undefined,
              contextForecastData: undefined,
              focusChartData: undefined,
              focusForecastData: undefined,
              modelPlotEnabled:
                isModelPlotChartableForDetector(currentSelectedJob, selectedDetectorIndex) &&
                isModelPlotEnabled(currentSelectedJob, selectedDetectorIndex, entityControls),
              hasResults: false,
              dataNotChartable: false,
            }
          : {}),
      },
      () => {
        const { loadCounter, modelPlotEnabled } = this.state;

        const jobs = createTimeSeriesJobData(mlJobService.jobs);
        const selectedJob = mlJobService.getJob(selectedJobId);
        const detectorIndex = selectedDetectorIndex;

        let awaitingCount = 3;

        const stateUpdate: State = {};

        // finish() function, called after each data set has been loaded and processed.
        // The last one to call it will trigger the page render.
        const finish = (counterVar: number) => {
          awaitingCount--;
          if (awaitingCount === 0 && counterVar === loadCounter) {
            stateUpdate.hasResults =
              (Array.isArray(stateUpdate.contextChartData) &&
                stateUpdate.contextChartData.length > 0) ||
              (Array.isArray(stateUpdate.contextForecastData) &&
                stateUpdate.contextForecastData.length > 0);
            stateUpdate.loading = false;

            // Set zoomFrom/zoomTo attributes in scope which will result in the metric chart automatically
            // selecting the specified range in the context chart, and so loading that date range in the focus chart.
            // Only touch the zoom range if data for the context chart has been loaded and all necessary
            // partition fields have a selection.
            if (
              stateUpdate.contextChartData.length &&
              this.arePartitioningFieldsProvided() === true
            ) {
              // Check for a zoom parameter in the appState (URL).
              let focusRange = calculateInitialFocusRange(
                zoom,
                stateUpdate.contextAggregationInterval,
                bounds
              );
              if (
                focusRange === undefined ||
                this.previousSelectedForecastId !== this.props.selectedForecastId
              ) {
                focusRange = calculateDefaultFocusRange(
                  autoZoomDuration,
                  stateUpdate.contextAggregationInterval,
                  stateUpdate.contextChartData,
                  stateUpdate.contextForecastData
                );
                this.previousSelectedForecastId = this.props.selectedForecastId;
              }

              this.contextChartSelected({
                from: focusRange[0],
                to: focusRange[1],
              });
            }

            this.setState(stateUpdate);
          }
        };

        const nonBlankEntities = entityControls.filter((entity) => {
          return entity.fieldValue !== null;
        }) as unknown as MlEntityField[];

        if (
          modelPlotEnabled === false &&
          isSourceDataChartableForDetector(selectedJob, detectorIndex) === false &&
          nonBlankEntities.length > 0
        ) {
          // For detectors where model plot has been enabled with a terms filter and the
          // selected entity(s) are not in the terms list, indicate that data cannot be viewed.
          stateUpdate.hasResults = false;
          stateUpdate.loading = false;
          stateUpdate.dataNotChartable = true;
          this.setState(stateUpdate);
          return;
        }

        // Calculate the aggregation interval for the context chart.
        // Context chart swimlane will display bucket anomaly score at the same interval.
        stateUpdate.contextAggregationInterval = calculateAggregationInterval(
          bounds,
          CHARTS_POINT_TARGET,
          jobs,
          selectedJob
        );

        // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
        // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
        // to some extent with all detector functions if not searching complete buckets.
        const searchBounds = getBoundsRoundedToInterval(
          bounds,
          stateUpdate.contextAggregationInterval,
          false
        );

        // Query 1 - load metric data at low granularity across full time range.
        // Pass a counter flag into the finish() function to make sure we only process the results
        // for the most recent call to the load the data in cases where the job selection and time filter
        // have been altered in quick succession (such as from the job picker with 'Apply time range').
        const counter = loadCounter;
        mlTimeSeriesSearchService
          .getMetricData(
            selectedJob,
            detectorIndex,
            nonBlankEntities,
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf(),
            stateUpdate.contextAggregationInterval.asMilliseconds(),
            functionToPlotByIfMetric
          )
          .toPromise()
          .then((resp) => {
            const fullRangeChartData = processMetricPlotResults(resp.results, modelPlotEnabled);
            stateUpdate.contextChartData = fullRangeChartData;
            finish(counter);
          })
          .catch((err) => {
            const errorMsg = i18n.translate('xpack.ml.timeSeriesExplorer.metricDataErrorMessage', {
              defaultMessage: 'Error getting metric data',
            });
            this.displayErrorToastMessages(err, errorMsg);
          });

        // Query 2 - load max record score at same granularity as context chart
        // across full time range for use in the swimlane.
        mlResultsService
          .getRecordMaxScoreByTime(
            selectedJob.job_id,
            this.getCriteriaFields(detectorIndex, entityControls),
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf(),
            stateUpdate.contextAggregationInterval.asMilliseconds(),
            functionToPlotByIfMetric
          )
          .then((resp) => {
            const fullRangeRecordScoreData = processRecordScoreResults(resp.results);
            stateUpdate.swimlaneData = fullRangeRecordScoreData;
            finish(counter);
          })
          .catch((err) => {
            const errorMsg = i18n.translate(
              'xpack.ml.timeSeriesExplorer.bucketAnomalyScoresErrorMessage',
              {
                defaultMessage: 'Error getting bucket anomaly scores',
              }
            );

            this.displayErrorToastMessages(err, errorMsg);
          });

        // Query 3 - load details on the chart used in the chart title (charting function and entity(s)).
        mlTimeSeriesSearchService
          .getChartDetails(
            selectedJob,
            detectorIndex,
            entityControls,
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf()
          )
          .then((resp) => {
            stateUpdate.chartDetails = resp.results;
            finish(counter);
          })
          .catch((err) => {
            this.displayErrorToastMessages(
              err,
              i18n.translate('xpack.ml.timeSeriesExplorer.entityCountsErrorMessage', {
                defaultMessage: 'Error getting entity counts',
              })
            );
          });

        // Plus query for forecast data if there is a forecastId stored in the appState.
        if (selectedForecastId !== undefined) {
          awaitingCount++;
          let aggType;
          const detector = selectedJob.analysis_config.detectors[detectorIndex];
          const esAgg = mlFunctionToESAggregation(detector.function);
          if (modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
            aggType = { avg: 'sum', max: 'sum', min: 'sum' };
          }
          mlForecastService
            .getForecastData(
              selectedJob,
              detectorIndex,
              selectedForecastId,
              nonBlankEntities,
              searchBounds.min.valueOf(),
              searchBounds.max.valueOf(),
              stateUpdate.contextAggregationInterval.asMilliseconds(),
              aggType
            )
            .toPromise()
            .then((resp) => {
              stateUpdate.contextForecastData = processForecastResults(resp.results);
              finish(counter);
            })
            .catch((err) => {
              this.displayErrorToastMessages(
                err,
                i18n.translate('xpack.ml.timeSeriesExplorer.forecastDataErrorMessage', {
                  defaultMessage: 'Error loading forecast data for forecast ID {forecastId}',
                  values: { forecastId: selectedForecastId },
                })
              );
            });
        }
      }
    );
  };

  toggleShowAnnotationsHandler = () => {
    this.setState((prevState) => ({
      showAnnotations: !prevState.showAnnotations,
    }));
  };

  toggleShowForecastHandler = () => {
    this.setState((prevState) => ({
      showForecast: !prevState.showForecast,
    }));
  };

  toggleShowModelBoundsHandler = () => {
    this.setState({
      showModelBounds: !this.state.showModelBounds,
    });
  };

  componentDidMount() {
    // Required to redraw the time series chart when the container is resized.
    console.log('--- GETTING HERE ---');
    this.resizeChecker = new ResizeChecker(this.resizeRef.current);
    this.resizeChecker?.on('resize', () => {
      this.resizeHandler();
    });
    this.resizeHandler();
    // Listen for context chart updates.
    this.subscriptions.add(
      this.contextChart$
        .pipe(
          tap((selection) => {
            this.setState({
              zoomFrom: selection.from,
              zoomTo: selection.to,
            });
          }),
          debounceTime(500),
          tap((selection) => {
            const {
              contextChartData,
              contextForecastData,
              focusChartData,
              zoomFromFocusLoaded,
              zoomToFocusLoaded,
            } = this.state;
            if (
              (contextChartData === undefined || contextChartData.length === 0) &&
              (contextForecastData === undefined || contextForecastData.length === 0)
            ) {
              return;
            }
            if (
              (this.contextChartSelectedInitCallDone === false && focusChartData === undefined) ||
              zoomFromFocusLoaded.getTime() !== selection.from.getTime() ||
              zoomToFocusLoaded.getTime() !== selection.to.getTime()
            ) {
              this.contextChartSelectedInitCallDone = true;
              this.setState({
                loading: true,
                fullRefresh: false,
              });
            }
          }),
          switchMap((selection) => {
            const { selectedJobId } = this.props;
            const jobs = createTimeSeriesJobData(mlJobService.jobs);
            const selectedJob = mlJobService.getJob(selectedJobId);
            // Calculate the aggregation interval for the focus chart.
            const bounds = { min: moment(selection.from), max: moment(selection.to) };
            const focusAggregationInterval = calculateAggregationInterval(
              bounds,
              CHARTS_POINT_TARGET,
              jobs,
              selectedJob
            );
            // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
            // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
            // to some extent with all detector functions if not searching complete buckets.
            const searchBounds = getBoundsRoundedToInterval(
              bounds,
              focusAggregationInterval,
              false
            );
            return forkJoin([
              this.getFocusData(selection),
              // Load the data for the anomalies table.
              ...[
                this.props.loadAnomaliesTableData
                  ? this.props.loadAnomaliesTableData(
                      searchBounds.min.valueOf(),
                      searchBounds.max.valueOf()
                    )
                  : [],
              ],
            ]);
          }),
          withLatestFrom(this.contextChart$)
        )
        .subscribe(([[refreshFocusData, tableData], selection]) => {
          const { modelPlotEnabled } = this.state;
          // All the data is ready now for a state update.
          this.setState({
            focusAggregationInterval: this.getFocusAggregationInterval({
              from: selection.from,
              to: selection.to,
            }),
            loading: false,
            showModelBoundsCheckbox: modelPlotEnabled && refreshFocusData.focusChartData.length > 0,
            zoomFromFocusLoaded: selection.from,
            zoomToFocusLoaded: selection.to,
            ...refreshFocusData,
            ...(tableData ? tableData : {}),
          });
        })
    );
    this.componentDidUpdate();
  }

  componentDidUpdate(previousProps?: Props) {
    if (
      previousProps === undefined ||
      previousProps.selectedForecastId !== this.props.selectedForecastId
    ) {
      if (this.props.selectedForecastId !== undefined) {
        // Ensure the forecast data will be shown if hidden previously.
        this.setState({ showForecast: true });
        // Not best practice but we need the previous value for another comparison
        // once all the data was loaded.
        if (previousProps !== undefined) {
          this.previousSelectedForecastId = previousProps.selectedForecastId;
        }
      }
    }

    if (
      previousProps === undefined ||
      !isEqual(previousProps.bounds, this.props.bounds) ||
      (!isEqual(previousProps.lastRefresh, this.props.lastRefresh) &&
        previousProps.lastRefresh !== 0) ||
      !isEqual(previousProps.selectedDetectorIndex, this.props.selectedDetectorIndex) ||
      !isEqual(previousProps.selectedEntities, this.props.selectedEntities) ||
      previousProps.selectedForecastId !== this.props.selectedForecastId ||
      previousProps.selectedJobId !== this.props.selectedJobId ||
      previousProps.functionDescription !== this.props.functionDescription
    ) {
      const fullRefresh =
        previousProps === undefined ||
        !isEqual(previousProps.bounds, this.props.bounds) ||
        !isEqual(previousProps.selectedDetectorIndex, this.props.selectedDetectorIndex) ||
        !isEqual(previousProps.selectedEntities, this.props.selectedEntities) ||
        previousProps.selectedForecastId !== this.props.selectedForecastId ||
        previousProps.selectedJobId !== this.props.selectedJobId ||
        previousProps.functionDescription !== this.props.functionDescription;
      this.loadSingleMetricData(fullRefresh);
    }
  }

  componentWillUnmount() {
    this.subscriptions.unsubscribe();
    this.resizeChecker?.destroy();
    this.unmounted = true;
  }

  render() {
    const {
      chartDataError,
      contextAggregationInterval,
      contextChartData,
      contextForecastData,
      dataNotChartable,
      focusAggregationInterval,
      focusAnnotationData,
      focusChartData,
      focusForecastData,
      fullRefresh,
      hasResults,
      loading,
      modelPlotEnabled,
      showAnnotations,
      showAnnotationsCheckbox,
      showForecast,
      showForecastCheckbox,
      showModelBounds,
      showModelBoundsCheckbox,
      svgWidth,
      swimlaneData,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
    } = this.state;

    const {
      arePartitioningFieldsProvided,
      autoZoomDuration,
      bounds,
      hasJobs,
      lastRefresh,
      selectedDetectorIndex,
      selectedJobId,
    } = this.props;

    const chartProps = {
      modelPlotEnabled,
      contextChartData,
      contextChartSelected: this.contextChartSelected,
      contextForecastData,
      contextAggregationInterval,
      swimlaneData,
      focusAnnotationData,
      focusChartData,
      focusForecastData,
      focusAggregationInterval,
      svgWidth,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      autoZoomDuration,
    };

    let renderFocusChartOnly = true;

    if (
      isEqual(this.previousChartProps.focusForecastData, chartProps.focusForecastData) &&
      isEqual(this.previousChartProps.focusChartData, chartProps.focusChartData) &&
      isEqual(this.previousChartProps.focusAnnotationData, chartProps.focusAnnotationData) &&
      this.previousShowForecast === showForecast &&
      this.previousShowModelBounds === showModelBounds &&
      this.props.previousRefresh === lastRefresh
    ) {
      renderFocusChartOnly = false;
    }

    this.previousChartProps = chartProps;
    this.previousShowForecast = showForecast;
    this.previousShowModelBounds = showModelBounds;

    const selectedJob = mlJobService.getJob(selectedJobId);
    const entityControls = this.props.entityControls; //  this.getControlsForDetector();
    // const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    // const arePartitioningFieldsProvided = this.arePartitioningFieldsProvided();
    // const detectors = getViewableDetectors(selectedJob);

    return (
      <>
        {fullRefresh && loading === true && (
          <LoadingIndicator
            label={i18n.translate('xpack.ml.timeSeriesExplorer.loadingLabel', {
              defaultMessage: 'Loading',
            })}
          />
        )}
        {loading === false && chartDataError !== undefined && (
          <TimeseriesexplorerChartDataError errorMsg={chartDataError} />
        )}
        {arePartitioningFieldsProvided &&
          hasJobs &&
          (fullRefresh === false || loading === false) &&
          hasResults === false &&
          chartDataError === undefined && (
            <TimeseriesexplorerNoChartData
              dataNotChartable={dataNotChartable}
              entities={entityControls as unknown as Entity[]}
            />
          )}
        <EuiFlexGroup style={{ float: 'right' }}>
          {showModelBoundsCheckbox && (
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id="toggleModelBoundsCheckbox"
                label={i18n.translate('xpack.ml.timeSeriesExplorer.showModelBoundsLabel', {
                  defaultMessage: 'show model bounds',
                })}
                checked={showModelBounds}
                onChange={this.toggleShowModelBoundsHandler}
              />
            </EuiFlexItem>
          )}

          {showAnnotationsCheckbox && (
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id="toggleAnnotationsCheckbox"
                label={i18n.translate('xpack.ml.timeSeriesExplorer.annotationsLabel', {
                  defaultMessage: 'annotations',
                })}
                checked={showAnnotations}
                onChange={this.toggleShowAnnotationsHandler}
              />
            </EuiFlexItem>
          )}

          {showForecastCheckbox && (
            <EuiFlexItem grow={false}>
              <EuiCheckbox
                id="toggleShowForecastCheckbox"
                label={
                  <span data-test-subj={'mlForecastCheckbox'}>
                    {i18n.translate('xpack.ml.timeSeriesExplorer.showForecastLabel', {
                      defaultMessage: 'show forecast',
                    })}
                  </span>
                }
                checked={showForecast}
                onChange={this.toggleShowForecastHandler}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <TimeSeriesChartWithTooltips
          chartProps={chartProps}
          contextAggregationInterval={contextAggregationInterval}
          bounds={bounds}
          detectorIndex={selectedDetectorIndex}
          renderFocusChartOnly={renderFocusChartOnly}
          selectedJob={selectedJob}
          selectedEntities={this.props.selectedEntities}
          showAnnotations={showAnnotations}
          showForecast={showForecast}
          showModelBounds={showModelBounds}
          lastRefresh={lastRefresh}
        />
      </>
    );
  }
}
