/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering Single Metric Viewer.
 */

import { get, isEqual } from 'lodash';
import moment from 'moment-timezone';
import {
  Subject,
  Subscription,
  forkJoin,
  map,
  debounceTime,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { context } from '@kbn/kibana-react-plugin/public';
import { ML_JOB_AGGREGATION, aggregationTypeTransform } from '@kbn/ml-anomaly-utils';
import { getBoundsRoundedToInterval } from '@kbn/ml-time-buckets';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { ANOMALIES_TABLE_DEFAULT_QUERY_SIZE } from '../../../../common/constants/search';
import {
  isModelPlotEnabled,
  isModelPlotChartableForDetector,
  isSourceDataChartableForDetector,
  mlFunctionToESAggregation,
} from '../../../../common/util/job_utils';

import { LoadingIndicator } from '../../components/loading_indicator/loading_indicator';
import { ForecastingModal } from '../components/forecasting_modal/forecasting_modal';
import { TimeseriesexplorerNoChartData } from '../components/timeseriesexplorer_no_chart_data';

import {
  APP_STATE_ACTION,
  CHARTS_POINT_TARGET,
  TIME_FIELD_NAME,
} from '../timeseriesexplorer_constants';
import { getControlsForDetector } from '../get_controls_for_detector';
import { TimeSeriesChartWithTooltips } from '../components/timeseries_chart/timeseries_chart_with_tooltip';
import { isMetricDetector } from '../get_function_description';
import { TimeseriesexplorerChartDataError } from '../components/timeseriesexplorer_chart_data_error';
import { TimeseriesExplorerCheckbox } from './timeseriesexplorer_checkbox';
import { timeSeriesExplorerServiceFactory } from '../../util/time_series_explorer_service';
import { getTimeseriesexplorerDefaultState } from '../timeseriesexplorer_utils';
import { mlJobServiceFactory } from '../../services/job_service';
import { forecastServiceFactory } from '../../services/forecast_service';
import { SingleMetricViewerTitleWithFilters } from './timeseriesexplorer_title';
import { TimeSeriesExplorerEmbeddableControls } from './timeseriesexplorer_embeddable_controls';

export class TimeSeriesExplorerEmbeddableChart extends React.Component {
  static propTypes = {
    api: PropTypes.object,
    appStateHandler: PropTypes.func.isRequired,
    autoZoomDuration: PropTypes.number.isRequired,
    bounds: PropTypes.object.isRequired,
    chartWidth: PropTypes.number.isRequired,
    chartHeight: PropTypes.number,
    lastRefresh: PropTypes.number.isRequired,
    onRenderComplete: PropTypes.func,
    previousRefresh: PropTypes.number.isRequired,
    selectedJob: PropTypes.object.isRequired,
    selectedJobStats: PropTypes.object.isRequired,
    selectedJobId: PropTypes.string.isRequired,
    selectedDetectorIndex: PropTypes.number,
    selectedEntities: PropTypes.object,
    selectedForecastId: PropTypes.string,
    tableInterval: PropTypes.string,
    tableSeverity: PropTypes.number,
    zoom: PropTypes.object,
    toastNotificationService: PropTypes.object,
    dataViewsService: PropTypes.object,
    onForecastComplete: PropTypes.func,
  };

  state = getTimeseriesexplorerDefaultState();

  subscriptions = new Subscription();

  unmounted = false;

  /**
   * Subject for listening brush time range selection.
   */
  contextChart$ = new Subject();

  /**
   * Access ML services in react context.
   */
  static contextType = context;

  mlTimeSeriesExplorer;
  mlForecastService;

  /**
   * Returns field names that don't have a selection yet.
   */
  getFieldNamesWithEmptyValues = () => {
    const latestEntityControls = this.getControlsForDetector();
    return latestEntityControls
      .filter(({ fieldValue }) => fieldValue === null)
      .map(({ fieldName }) => fieldName);
  };

  /**
   * Checks if all entity control dropdowns have a selection.
   */
  arePartitioningFieldsProvided = () => {
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    return fieldNamesWithEmptyValues.length === 0;
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

  setFunctionDescription = (selectedFuction) => {
    this.props.appStateHandler(APP_STATE_ACTION.SET_FUNCTION_DESCRIPTION, selectedFuction);
  };

  previousChartProps = {};
  previousShowAnnotations = undefined;
  previousShowForecast = undefined;
  previousShowModelBounds = undefined;

  tableFilter = (field, value, operator) => {
    const entities = this.getControlsForDetector();
    const entity = entities.find(({ fieldName }) => fieldName === field);

    if (entity === undefined) {
      return;
    }

    const { appStateHandler } = this.props;

    let resultValue = '';
    if (operator === '+' && entity.fieldValue !== value) {
      resultValue = value;
    } else if (operator === '-' && entity.fieldValue === value) {
      resultValue = null;
    } else {
      return;
    }

    const resultEntities = {
      ...entities.reduce((appStateEntities, appStateEntity) => {
        appStateEntities[appStateEntity.fieldName] = appStateEntity.fieldValue;
        return appStateEntities;
      }, {}),
      [entity.fieldName]: resultValue,
    };

    appStateHandler(APP_STATE_ACTION.SET_ENTITIES, resultEntities);
  };

  contextChartSelectedInitCallDone = false;

  getFocusAggregationInterval(selection) {
    const { selectedJob } = this.props;

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };

    return this.mlTimeSeriesExplorer.calculateAggregationInterval(
      bounds,
      CHARTS_POINT_TARGET,
      selectedJob
    );
  }

  /**
   * Gets focus data for the current component state
   */
  getFocusData(selection) {
    const { selectedForecastId, selectedDetectorIndex, functionDescription, selectedJob } =
      this.props;
    const { modelPlotEnabled } = this.state;
    if (isMetricDetector(selectedJob, selectedDetectorIndex) && functionDescription === undefined) {
      return;
    }
    const entityControls = this.getControlsForDetector();

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(selection.from), max: moment(selection.to) };
    const focusAggregationInterval = this.getFocusAggregationInterval(selection);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, focusAggregationInterval, false);

    return this.mlTimeSeriesExplorer.getFocusData(
      this.getCriteriaFields(selectedDetectorIndex, entityControls),
      selectedDetectorIndex,
      focusAggregationInterval,
      selectedForecastId,
      modelPlotEnabled,
      entityControls.filter((entity) => entity.fieldValue !== null),
      searchBounds,
      selectedJob,
      functionDescription,
      TIME_FIELD_NAME
    );
  }

  contextChartSelected = (selection) => {
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

  loadAnomaliesTableData = (earliestMs, latestMs) => {
    const {
      dateFormatTz,
      selectedDetectorIndex,
      selectedJob,
      tableInterval,
      tableSeverity,
      functionDescription,
    } = this.props;
    const entityControls = this.getControlsForDetector();

    return this.context.services.mlServices.mlApi.results
      .getAnomaliesTableData(
        [selectedJob.job_id],
        this.getCriteriaFields(selectedDetectorIndex, entityControls),
        [],
        tableInterval,
        tableSeverity,
        earliestMs,
        latestMs,
        dateFormatTz,
        ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
        undefined,
        undefined,
        functionDescription
      )
      .pipe(
        map((resp) => {
          const anomalies = resp.anomalies;
          anomalies.forEach((anomaly) => {
            // Add a detector property to each anomaly.
            // Default to functionDescription if no description available.
            // TODO - when job_service is moved server_side, move this to server endpoint.
            const jobDetectors = selectedJob.analysis_config.detectors;
            const detector = jobDetectors[anomaly.detectorIndex];
            anomaly.detector = get(
              detector,
              ['detector_description'],
              anomaly.source.function_description
            );

            // For detectors with rules, add a property with the rule count.
            const customRules = detector.custom_rules;
            if (customRules !== undefined) {
              anomaly.rulesLength = customRules.length;
            }

            // Add properties used for building the links menu.
            // TODO - when job_service is moved server_side, move this to server endpoint.
            if (selectedJob.custom_settings && selectedJob.custom_settings.custom_urls) {
              anomaly.customUrls = selectedJob.custom_settings.custom_urls;
            }
          });

          return {
            tableData: {
              anomalies,
              interval: resp.interval,
              examplesByJobId: resp.examplesByJobId,
              showViewSeriesLink: false,
            },
          };
        })
      );
  };

  setForecastId = (forecastId) => {
    this.props.appStateHandler(APP_STATE_ACTION.SET_FORECAST_ID, forecastId);
  };

  displayErrorToastMessages = (error, errorMsg) => {
    if (this.props.toastNotificationService) {
      this.props.toastNotificationService.displayErrorToast(error, errorMsg, 2000);
    }
    this.setState({ loading: false, chartDataError: errorMsg });
  };

  loadSingleMetricData = (fullRefresh = true) => {
    const {
      autoZoomDuration,
      bounds,
      selectedDetectorIndex,
      selectedForecastId,
      zoom,
      functionDescription,
      selectedJob,
    } = this.props;

    const { loadCounter: currentLoadCounter } = this.state;
    if (selectedJob === undefined) {
      return;
    }
    if (isMetricDetector(selectedJob, selectedDetectorIndex) && functionDescription === undefined) {
      return;
    }

    const functionToPlotByIfMetric = aggregationTypeTransform.toES(functionDescription);

    this.contextChartSelectedInitCallDone = false;

    // Only when `fullRefresh` is true we'll reset all data
    // and show the loading spinner within the page.
    const entityControls = this.getControlsForDetector();
    this.setState(
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
                isModelPlotChartableForDetector(selectedJob, selectedDetectorIndex) &&
                isModelPlotEnabled(selectedJob, selectedDetectorIndex, entityControls),
              hasResults: false,
              dataNotChartable: false,
            }
          : {}),
      },
      () => {
        const { loadCounter, modelPlotEnabled } = this.state;
        const { selectedJob } = this.props;

        const detectorIndex = selectedDetectorIndex;

        let awaitingCount = 3;

        const stateUpdate = {};

        // finish() function, called after each data set has been loaded and processed.
        // The last one to call it will trigger the page render.
        const finish = (counterVar) => {
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
              let focusRange = this.mlTimeSeriesExplorer.calculateInitialFocusRange(
                zoom,
                stateUpdate.contextAggregationInterval,
                bounds
              );
              if (
                focusRange === undefined ||
                this.previousSelectedForecastId !== this.props.selectedForecastId
              ) {
                focusRange = this.mlTimeSeriesExplorer.calculateDefaultFocusRange(
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
            if (this.props.onRenderComplete !== undefined) {
              this.props.onRenderComplete();
            }
          }
        };

        const nonBlankEntities = entityControls.filter((entity) => {
          return entity.fieldValue !== null;
        });

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
        stateUpdate.contextAggregationInterval =
          this.mlTimeSeriesExplorer.calculateAggregationInterval(
            bounds,
            CHARTS_POINT_TARGET,
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
        this.context.services.mlServices.mlTimeSeriesSearchService
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
            const fullRangeChartData = this.mlTimeSeriesExplorer.processMetricPlotResults(
              resp.results,
              modelPlotEnabled
            );
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
        this.context.services.mlServices.mlResultsService
          .getRecordMaxScoreByTime(
            selectedJob.job_id,
            this.getCriteriaFields(detectorIndex, entityControls),
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf(),
            stateUpdate.contextAggregationInterval.asMilliseconds(),
            functionToPlotByIfMetric
          )
          .then((resp) => {
            const fullRangeRecordScoreData = this.mlTimeSeriesExplorer.processRecordScoreResults(
              resp.results
            );
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
        this.context.services.mlServices.mlTimeSeriesSearchService
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
          const detector = selectedJob.analysis_config.detectors[detectorIndex];
          const esAgg = mlFunctionToESAggregation(detector.function);
          const aggType =
            modelPlotEnabled === false &&
            (esAgg === ML_JOB_AGGREGATION.SUM || esAgg === ML_JOB_AGGREGATION.COUNT)
              ? { avg: 'sum', max: 'sum', min: 'sum' }
              : undefined;

          this.mlForecastService
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
              stateUpdate.contextForecastData = this.mlTimeSeriesExplorer.processForecastResults(
                resp.results
              );
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

  /**
   * Updates local state of detector related controls from the global state.
   * @param callback to invoke after a state update.
   */
  getControlsForDetector = () => {
    const { selectedDetectorIndex, selectedEntities, selectedJob } = this.props;
    return getControlsForDetector(selectedDetectorIndex, selectedEntities, selectedJob);
  };

  /**
   * Updates criteria fields for API calls, e.g. getAnomaliesTableData
   * @param detectorIndex
   * @param entities
   */
  getCriteriaFields(detectorIndex, entities) {
    // Only filter on the entity if the field has a value.
    const nonBlankEntities = entities.filter((entity) => entity.fieldValue !== null);
    return [
      {
        fieldName: 'detector_index',
        fieldValue: detectorIndex,
      },
      ...nonBlankEntities,
    ];
  }

  async componentDidMount() {
    this.mlTimeSeriesExplorer = timeSeriesExplorerServiceFactory(
      this.context.services.uiSettings,
      this.context.services.mlServices.mlApi,
      this.context.services.mlServices.mlResultsService
    );
    this.mlForecastService = forecastServiceFactory(this.context.services.mlServices.mlApi);

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
            // Calculate the aggregation interval for the focus chart.
            const bounds = { min: moment(selection.from), max: moment(selection.to) };

            // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
            // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
            // to some extent with all detector functions if not searching complete buckets.
            const searchBounds = getBoundsRoundedToInterval(
              bounds,
              this.getFocusAggregationInterval({
                from: selection.from,
                to: selection.to,
              }),
              false
            );

            return forkJoin([
              this.getFocusData(selection),
              // Load the data for the anomalies table.
              this.loadAnomaliesTableData(searchBounds.min.valueOf(), searchBounds.max.valueOf()),
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
            ...tableData,
          });
        })
    );

    if (this.context && this.props.selectedJob !== undefined) {
      // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
      this.context.services.mlServices.mlFieldFormatService.populateFormats([
        this.props.selectedJob.job_id,
      ]);
    }

    // Populate mlJobService to work with LinksMenuUI.
    this.mlJobService = mlJobServiceFactory(undefined, this.context.services.mlServices.mlApi);
    await this.mlJobService.loadJobsWrapper();

    this.componentDidUpdate();
  }

  componentDidUpdate(previousProps) {
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
      previousProps.selectedJob?.job_id !== this.props.selectedJob?.job_id ||
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
        previousProps.selectedJob?.job_id !== this.props.selectedJob?.job_id ||
        previousProps.functionDescription !== this.props.functionDescription;
      this.loadSingleMetricData(fullRefresh);
    }

    if (previousProps === undefined) {
      return;
    }
  }

  componentWillUnmount() {
    this.subscriptions.unsubscribe();
    this.unmounted = true;
  }

  render() {
    const {
      autoZoomDuration,
      bounds,
      chartWidth,
      chartHeight,
      lastRefresh,
      onForecastComplete,
      selectedEntities,
      selectedDetectorIndex,
      selectedJob,
      selectedJobStats,
      shouldShowForecastButton,
    } = this.props;

    const {
      chartDetails,
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
      swimlaneData,
      tableData,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      chartDataError,
      sourceIndicesWithGeoFields,
    } = this.state;
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
      svgWidth: chartWidth,
      svgHeight: chartHeight,
      zoomFrom,
      zoomTo,
      zoomFromFocusLoaded,
      zoomToFocusLoaded,
      autoZoomDuration,
    };

    const entityControls = this.getControlsForDetector();
    const fieldNamesWithEmptyValues = this.getFieldNamesWithEmptyValues();
    const arePartitioningFieldsProvided = this.arePartitioningFieldsProvided();

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

    return (
      <>
        {fieldNamesWithEmptyValues.length > 0 && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.singleMetricRequiredMessage"
                  defaultMessage="To view a single metric, select {missingValuesCount, plural, one {a value for {fieldName1}} other {values for {fieldName1} and {fieldName2}}}."
                  values={{
                    missingValuesCount: fieldNamesWithEmptyValues.length,
                    fieldName1: fieldNamesWithEmptyValues[0],
                    fieldName2: fieldNamesWithEmptyValues[1],
                  }}
                />
              }
              iconType="help"
              size="s"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiSpacer size="m" />

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
          selectedJob &&
          (fullRefresh === false || loading === false) &&
          hasResults === false &&
          chartDataError === undefined && (
            <TimeseriesexplorerNoChartData
              dataNotChartable={dataNotChartable}
              entities={entityControls}
            />
          )}
        {arePartitioningFieldsProvided &&
          selectedJob &&
          (fullRefresh === false || loading === false) &&
          hasResults === true && (
            <div>
              <SingleMetricViewerTitleWithFilters
                api={this.props.api}
                functionLabel={chartDetails.functionLabel}
                entityData={chartDetails.entityData}
              />
              <EuiFlexGroup style={{ float: 'right' }} alignItems="center">
                <TimeSeriesExplorerEmbeddableControls
                  showAnnotations={showAnnotations}
                  showAnnotationsCheckbox={showAnnotationsCheckbox}
                  showForecast={showForecast}
                  showForecastCheckbox={showForecastCheckbox}
                  showModelBounds={showModelBounds}
                  showModelBoundsCheckbox={showModelBoundsCheckbox}
                  onShowAnnotationsChange={this.toggleShowAnnotationsHandler}
                  onShowForecastChange={this.toggleShowForecastHandler}
                  onShowModelBoundsChange={this.toggleShowModelBoundsHandler}
                />

                {arePartitioningFieldsProvided &&
                  selectedJob &&
                  shouldShowForecastButton === true && (
                    <EuiFlexItem grow={false} style={{ textAlign: 'right' }}>
                      <ForecastingModal
                        buttonMode={'empty'}
                        job={selectedJob}
                        jobState={selectedJobStats.state}
                        earliestRecordTimestamp={
                          selectedJobStats.data_counts.earliest_record_timestamp
                        }
                        latestRecordTimestamp={selectedJobStats.data_counts.latest_record_timestamp}
                        detectorIndex={selectedDetectorIndex}
                        entities={entityControls}
                        setForecastId={this.setForecastId}
                        className="forecast-controls"
                        onForecastComplete={onForecastComplete}
                        selectedForecastId={this.props.selectedForecastId}
                      />
                    </EuiFlexItem>
                  )}
              </EuiFlexGroup>

              <TimeSeriesChartWithTooltips
                chartProps={chartProps}
                contextAggregationInterval={contextAggregationInterval}
                bounds={bounds}
                detectorIndex={selectedDetectorIndex}
                embeddableMode
                renderFocusChartOnly={renderFocusChartOnly}
                selectedJob={selectedJob}
                selectedEntities={selectedEntities}
                showAnnotations={showAnnotations}
                showForecast={showForecast}
                showModelBounds={showModelBounds}
                lastRefresh={lastRefresh}
                tableData={tableData}
                sourceIndicesWithGeoFields={sourceIndicesWithGeoFields}
              />
            </div>
          )}
      </>
    );
  }
}
