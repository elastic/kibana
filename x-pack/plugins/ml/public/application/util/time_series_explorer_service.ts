/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import { aggregationTypeTransform } from '@kbn/ml-anomaly-utils';
import { isMultiBucketAnomaly, ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import moment from 'moment';
import type { Observable } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { each, get } from 'lodash';
import { catchError, map } from 'rxjs';
import { type MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds, TimeBucketsInterval } from '@kbn/ml-time-buckets';
import { parseInterval } from '../../../common/util/parse_interval';
import type { GetAnnotationsResponse } from '../../../common/types/annotations';
import { mlFunctionToESAggregation } from '../../../common/util/job_utils';
import { ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE } from '../../../common/constants/search';
import { CHARTS_POINT_TARGET } from '../timeseriesexplorer/timeseriesexplorer_constants';
import { timeBucketsServiceFactory } from './time_buckets_service';
import type { Job } from '../../../common/types/anomaly_detection_jobs';
import type { CriteriaField } from '../services/results_service';
import {
  MAX_SCHEDULED_EVENTS,
  TIME_FIELD_NAME,
} from '../timeseriesexplorer/timeseriesexplorer_constants';
import type { MlApiServices } from '../services/ml_api_service';
import { mlResultsServiceProvider, type MlResultsService } from '../services/results_service';
import { forecastServiceFactory } from '../services/forecast_service';
import { timeSeriesSearchServiceFactory } from '../timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service';
import { useMlKibana } from '../contexts/kibana';

export interface Interval {
  asMilliseconds: () => number;
  expression: string;
}

interface ChartDataPoint {
  date: Date;
  value: number | null;
  upper?: number | null;
  lower?: number | null;
}

interface FocusData {
  focusChartData: ChartDataPoint[];
  anomalyRecords: MlAnomalyRecordDoc[];
  scheduledEvents: any;
  showForecastCheckbox?: boolean;
  focusAnnotationError?: string;
  focusAnnotationData?: any[];
  focusForecastData?: any;
}

// TODO Consolidate with legacy code in
// `ml/public/application/timeseriesexplorer/timeseriesexplorer_utils/timeseriesexplorer_utils.js`.
export function timeSeriesExplorerServiceFactory(
  uiSettings: IUiSettingsClient,
  mlApiServices: MlApiServices,
  mlResultsService: MlResultsService
) {
  const timeBuckets = timeBucketsServiceFactory(uiSettings);
  const mlForecastService = forecastServiceFactory(mlApiServices);
  const mlTimeSeriesSearchService = timeSeriesSearchServiceFactory(mlResultsService, mlApiServices);

  function getAutoZoomDuration(selectedJob: Job) {
    // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
    // Get the minimum bucket span of selected jobs.
    let autoZoomDuration;
    if (selectedJob.analysis_config.bucket_span) {
      const bucketSpan = parseInterval(selectedJob.analysis_config.bucket_span);
      const bucketSpanSeconds = bucketSpan!.asSeconds();

      // In most cases the duration can be obtained by simply multiplying the points target
      // Check that this duration returns the bucket span when run back through the
      // TimeBucket interval calculation.
      autoZoomDuration = bucketSpanSeconds * 1000 * (CHARTS_POINT_TARGET - 1);

      // Use a maxBars of 10% greater than the target.
      const maxBars = Math.floor(1.1 * CHARTS_POINT_TARGET);
      const buckets = timeBuckets.getTimeBuckets();
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
    }

    return autoZoomDuration;
  }

  function calculateAggregationInterval(
    bounds: TimeRangeBounds,
    bucketsTarget: number | undefined,
    selectedJob: Job
  ) {
    // Aggregation interval used in queries should be a function of the time span of the chart
    // and the bucket span of the selected job(s).
    const barTarget = bucketsTarget !== undefined ? bucketsTarget : 100;
    // Use a maxBars of 10% greater than the target.
    const maxBars = Math.floor(1.1 * barTarget);
    const buckets = timeBuckets.getTimeBuckets();
    buckets.setInterval('auto');
    buckets.setBounds(bounds);
    buckets.setBarTarget(Math.floor(barTarget));
    buckets.setMaxBars(maxBars);
    let aggInterval;

    if (selectedJob.analysis_config.bucket_span) {
      // Ensure the aggregation interval is always a multiple of the bucket span to avoid strange
      // behaviour such as adjacent chart buckets holding different numbers of job results.
      const bucketSpan = parseInterval(selectedJob.analysis_config.bucket_span);
      const bucketSpanSeconds = bucketSpan!.asSeconds();
      aggInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);

      // Set the interval back to the job bucket span if the auto interval is smaller.
      const secs = aggInterval.asSeconds();
      if (secs < bucketSpanSeconds) {
        buckets.setInterval(bucketSpanSeconds + 's');
        aggInterval = buckets.getInterval();
      }
    }

    return aggInterval;
  }

  function calculateInitialFocusRange(
    zoomState: any,
    contextAggregationInterval: any,
    bounds: TimeRangeBounds
  ) {
    if (zoomState !== undefined) {
      // Check that the zoom times are valid.
      // zoomFrom must be at or after context chart search bounds earliest,
      // zoomTo must be at or before context chart search bounds latest.
      const zoomFrom = moment(zoomState.from, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      const zoomTo = moment(zoomState.to, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      const searchBounds = timeBuckets.getBoundsRoundedToInterval(
        bounds,
        contextAggregationInterval,
        true
      );
      const earliest = searchBounds.min;
      const latest = searchBounds.max;

      if (
        zoomFrom.isValid() &&
        zoomTo.isValid() &&
        zoomTo.isAfter(zoomFrom) &&
        zoomFrom.isBetween(earliest, latest, null, '[]') &&
        zoomTo.isBetween(earliest, latest, null, '[]')
      ) {
        return [zoomFrom.toDate(), zoomTo.toDate()];
      }
    }

    return undefined;
  }

  function calculateDefaultFocusRange(
    autoZoomDuration: any,
    contextAggregationInterval: any,
    contextChartData: any,
    contextForecastData: any
  ) {
    const isForecastData = contextForecastData !== undefined && contextForecastData.length > 0;

    const combinedData =
      isForecastData === false ? contextChartData : contextChartData.concat(contextForecastData);
    const earliestDataDate = combinedData[0].date;
    const latestDataDate = combinedData[combinedData.length - 1].date;

    let rangeEarliestMs;
    let rangeLatestMs;

    if (isForecastData === true) {
      // Return a range centred on the start of the forecast range, depending
      // on the time range of the forecast and data.
      const earliestForecastDataDate = contextForecastData[0].date;
      const latestForecastDataDate = contextForecastData[contextForecastData.length - 1].date;

      rangeLatestMs = Math.min(
        earliestForecastDataDate.getTime() + autoZoomDuration / 2,
        latestForecastDataDate.getTime()
      );
      rangeEarliestMs = Math.max(rangeLatestMs - autoZoomDuration, earliestDataDate.getTime());
    } else {
      // Returns the range that shows the most recent data at bucket span granularity.
      rangeLatestMs = latestDataDate.getTime() + contextAggregationInterval.asMilliseconds();
      rangeEarliestMs = Math.max(earliestDataDate.getTime(), rangeLatestMs - autoZoomDuration);
    }

    return [new Date(rangeEarliestMs), new Date(rangeLatestMs)];
  }

  // Return dataset in format used by the swimlane.
  // i.e. array of Objects with keys date (JavaScript date) and score.
  function processRecordScoreResults(scoreData: any) {
    const bucketScoreData: any = [];
    each(scoreData, (dataForTime, time) => {
      bucketScoreData.push({
        date: new Date(+time),
        score: dataForTime.score,
      });
    });

    return bucketScoreData;
  }

  // Return dataset in format used by the single metric chart.
  // i.e. array of Objects with keys date (JavaScript date) and value,
  // plus lower and upper keys if model plot is enabled for the series.
  function processMetricPlotResults(metricPlotData: any, modelPlotEnabled: any) {
    const metricPlotChartData: any = [];
    if (modelPlotEnabled === true) {
      each(metricPlotData, (dataForTime, time) => {
        metricPlotChartData.push({
          date: new Date(+time),
          lower: dataForTime.modelLower,
          value: dataForTime.actual,
          upper: dataForTime.modelUpper,
        });
      });
    } else {
      each(metricPlotData, (dataForTime, time) => {
        metricPlotChartData.push({
          date: new Date(+time),
          value: dataForTime.actual,
        });
      });
    }

    return metricPlotChartData;
  }

  // Returns forecast dataset in format used by the single metric chart.
  // i.e. array of Objects with keys date (JavaScript date), isForecast,
  // value, lower and upper keys.
  function processForecastResults(forecastData: any) {
    const forecastPlotChartData: any = [];
    each(forecastData, (dataForTime, time) => {
      forecastPlotChartData.push({
        date: new Date(+time),
        isForecast: true,
        lower: dataForTime.forecastLower,
        value: dataForTime.prediction,
        upper: dataForTime.forecastUpper,
      });
    });

    return forecastPlotChartData;
  }

  // Finds the chart point which corresponds to an anomaly with the
  // specified time.
  function findChartPointForAnomalyTime(
    chartData: any,
    anomalyTime: any,
    aggregationInterval: any
  ) {
    let chartPoint;
    if (chartData === undefined) {
      return chartPoint;
    }

    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].date.getTime() === anomalyTime) {
        chartPoint = chartData[i];
        break;
      }
    }

    if (chartPoint === undefined) {
      // Find the time of the point which falls immediately before the
      // time of the anomaly. This is the start of the chart 'bucket'
      // which contains the anomalous bucket.
      let foundItem;
      const intervalMs = aggregationInterval.asMilliseconds();
      for (let i = 0; i < chartData.length; i++) {
        const itemTime = chartData[i].date.getTime();
        if (anomalyTime - itemTime < intervalMs) {
          foundItem = chartData[i];
          break;
        }
      }

      chartPoint = foundItem;
    }

    return chartPoint;
  }

  // Uses data from the list of anomaly records to add anomalyScore,
  // function, actual and typical properties, plus causes and multi-bucket
  // info if applicable, to the chartData entries for anomalous buckets.
  function processDataForFocusAnomalies(
    chartData: ChartDataPoint[],
    anomalyRecords: MlAnomalyRecordDoc[],
    aggregationInterval: Interval,
    modelPlotEnabled: boolean,
    functionDescription?: string
  ) {
    const timesToAddPointsFor: number[] = [];

    // Iterate through the anomaly records making sure we have chart points for each anomaly.
    const intervalMs = aggregationInterval.asMilliseconds();
    let lastChartDataPointTime: any;
    if (chartData !== undefined && chartData.length > 0) {
      lastChartDataPointTime = chartData[chartData.length - 1].date.getTime();
    }
    anomalyRecords.forEach((record: MlAnomalyRecordDoc) => {
      const recordTime = record[TIME_FIELD_NAME];
      const chartPoint = findChartPointForAnomalyTime(chartData, recordTime, aggregationInterval);
      if (chartPoint === undefined) {
        const timeToAdd = Math.floor(recordTime / intervalMs) * intervalMs;
        if (timesToAddPointsFor.indexOf(timeToAdd) === -1 && timeToAdd !== lastChartDataPointTime) {
          timesToAddPointsFor.push(timeToAdd);
        }
      }
    });

    timesToAddPointsFor.sort((a, b) => a - b);

    timesToAddPointsFor.forEach((time) => {
      const pointToAdd: ChartDataPoint = {
        date: new Date(time),
        value: null,
      };

      if (modelPlotEnabled === true) {
        pointToAdd.upper = null;
        pointToAdd.lower = null;
      }
      chartData.push(pointToAdd);
    });

    // Iterate through the anomaly records adding the
    // various properties required for display.
    anomalyRecords.forEach((record) => {
      // Look for a chart point with the same time as the record.
      // If none found, find closest time in chartData set.
      const recordTime = record[TIME_FIELD_NAME];
      if (
        record.function === ML_JOB_AGGREGATION.METRIC &&
        record.function_description !== functionDescription
      )
        return;

      const chartPoint = findChartPointForAnomalyTime(chartData, recordTime, aggregationInterval);
      if (chartPoint !== undefined) {
        // If chart aggregation interval > bucket span, there may be more than
        // one anomaly record in the interval, so use the properties from
        // the record with the highest anomalyScore.
        const recordScore = record.record_score;
        const pointScore = chartPoint.anomalyScore;
        if (pointScore === undefined || pointScore < recordScore) {
          chartPoint.anomalyScore = recordScore;
          chartPoint.function = record.function;

          if (record.actual !== undefined) {
            // If cannot match chart point for anomaly time
            // substitute the value with the record's actual so it won't plot as null/0
            if (chartPoint.value === null || record.function === ML_JOB_AGGREGATION.METRIC) {
              chartPoint.value = Array.isArray(record.actual) ? record.actual[0] : record.actual;
            }

            chartPoint.actual = record.actual;
            chartPoint.typical = record.typical;
          } else {
            const causes = get(record, 'causes', []);
            if (causes.length > 0) {
              chartPoint.byFieldName = record.by_field_name;
              chartPoint.numberOfCauses = causes.length;
              if (causes.length === 1) {
                // If only a single cause, copy actual and typical values to the top level.
                const cause = record.causes![0];
                chartPoint.actual = cause.actual;
                chartPoint.typical = cause.typical;
                // substitute the value with the record's actual so it won't plot as null/0
                if (chartPoint.value === null) {
                  chartPoint.value = cause.actual;
                }
              }
            }
          }

          if (
            record.anomaly_score_explanation !== undefined &&
            record.anomaly_score_explanation.multi_bucket_impact !== undefined
          ) {
            chartPoint.multiBucketImpact = record.anomaly_score_explanation.multi_bucket_impact;
          }

          chartPoint.isMultiBucketAnomaly = isMultiBucketAnomaly(record);
        }
      }
    });

    return chartData;
  }

  function findChartPointForScheduledEvent(chartData: any, eventTime: any) {
    let chartPoint;
    if (chartData === undefined) {
      return chartPoint;
    }

    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].date.getTime() === eventTime) {
        chartPoint = chartData[i];
        break;
      }
    }

    return chartPoint;
  }
  // Adds a scheduledEvents property to any points in the chart data set
  // which correspond to times of scheduled events for the job.
  function processScheduledEventsForChart(
    chartData: ChartDataPoint[],
    scheduledEvents: Array<{ events: any; time: number }> | undefined,
    aggregationInterval: TimeBucketsInterval
  ) {
    if (scheduledEvents !== undefined) {
      const timesToAddPointsFor: number[] = [];

      // Iterate through the scheduled events making sure we have a chart point for each event.
      const intervalMs = aggregationInterval.asMilliseconds();
      let lastChartDataPointTime: number | undefined;
      if (chartData !== undefined && chartData.length > 0) {
        lastChartDataPointTime = chartData[chartData.length - 1].date.getTime();
      }

      // In case there's no chart data/sparse data during these scheduled events
      // ensure we add chart points at every aggregation interval for these scheduled events.
      let sortRequired = false;
      each(scheduledEvents, (events, time) => {
        const exactChartPoint = findChartPointForScheduledEvent(chartData, +time);

        if (exactChartPoint !== undefined) {
          exactChartPoint.scheduledEvents = events;
        } else {
          const timeToAdd: number = Math.floor(time / intervalMs) * intervalMs;
          if (
            timesToAddPointsFor.indexOf(timeToAdd) === -1 &&
            timeToAdd !== lastChartDataPointTime
          ) {
            const pointToAdd = {
              date: new Date(timeToAdd),
              value: null,
              scheduledEvents: events,
            };

            chartData.push(pointToAdd);
            sortRequired = true;
          }
        }
      });

      // Sort chart data by time if extra points were added at the end of the array for scheduled events.
      if (sortRequired) {
        chartData.sort((a, b) => a.date.getTime() - b.date.getTime());
      }
    }

    return chartData;
  }

  function getFocusData(
    criteriaFields: CriteriaField[],
    detectorIndex: number,
    focusAggregationInterval: TimeBucketsInterval,
    forecastId: string,
    modelPlotEnabled: boolean,
    nonBlankEntities: any[],
    searchBounds: any,
    selectedJob: Job,
    functionDescription?: string | undefined
  ): Observable<FocusData> {
    const esFunctionToPlotIfMetric =
      functionDescription !== undefined
        ? aggregationTypeTransform.toES(functionDescription)
        : functionDescription;

    return forkJoin([
      // Query 1 - load metric data across selected time range.
      mlTimeSeriesSearchService.getMetricData(
        selectedJob,
        detectorIndex,
        nonBlankEntities,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        focusAggregationInterval.asMilliseconds(),
        esFunctionToPlotIfMetric
      ),
      // Query 2 - load all the records across selected time range for the chart anomaly markers.
      mlApiServices.results.getAnomalyRecords$(
        [selectedJob.job_id],
        criteriaFields,
        0,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        focusAggregationInterval.expression,
        functionDescription
      ),
      // Query 3 - load any scheduled events for the selected job.
      mlResultsService.getScheduledEventsByBucket(
        [selectedJob.job_id],
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        focusAggregationInterval.asMilliseconds(),
        1,
        MAX_SCHEDULED_EVENTS
      ),
      // Query 4 - load any annotations for the selected job.
      mlApiServices.annotations
        .getAnnotations$({
          jobIds: [selectedJob.job_id],
          earliestMs: searchBounds.min.valueOf(),
          latestMs: searchBounds.max.valueOf(),
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
          detectorIndex,
          entities: nonBlankEntities,
        })
        .pipe(
          catchError((resp) =>
            of({
              annotations: {},
              totalCount: 0,
              error: extractErrorMessage(resp),
              success: false,
            } as GetAnnotationsResponse)
          )
        ),
      // Plus query for forecast data if there is a forecastId stored in the appState.
      forecastId !== undefined
        ? (() => {
            let aggType;
            const detector = selectedJob.analysis_config.detectors[detectorIndex];
            const esAgg = mlFunctionToESAggregation(detector.function);
            if (!modelPlotEnabled && (esAgg === 'sum' || esAgg === 'count')) {
              aggType = { avg: 'sum', max: 'sum', min: 'sum' };
            }
            return mlForecastService.getForecastData(
              selectedJob,
              detectorIndex,
              forecastId,
              nonBlankEntities,
              searchBounds.min.valueOf(),
              searchBounds.max.valueOf(),
              focusAggregationInterval.asMilliseconds(),
              aggType
            );
          })()
        : of(null),
    ]).pipe(
      map(
        ([metricData, recordsForCriteria, scheduledEventsByBucket, annotations, forecastData]) => {
          // Sort in descending time order before storing in scope.
          const anomalyRecords = recordsForCriteria?.records
            .sort((a, b) => a[TIME_FIELD_NAME] - b[TIME_FIELD_NAME])
            .reverse();

          const scheduledEvents = scheduledEventsByBucket?.events[selectedJob.job_id];

          let focusChartData = processMetricPlotResults(metricData.results, modelPlotEnabled);
          // Tell the results container directives to render the focus chart.
          focusChartData = processDataForFocusAnomalies(
            focusChartData,
            anomalyRecords,
            focusAggregationInterval,
            modelPlotEnabled,
            functionDescription
          );
          focusChartData = processScheduledEventsForChart(
            focusChartData,
            scheduledEvents,
            focusAggregationInterval
          );

          const refreshFocusData: FocusData = {
            scheduledEvents,
            anomalyRecords,
            focusChartData,
          };

          if (annotations) {
            if (annotations.error !== undefined) {
              refreshFocusData.focusAnnotationError = annotations.error;
              refreshFocusData.focusAnnotationData = [];
            } else {
              refreshFocusData.focusAnnotationData = (
                annotations.annotations[selectedJob.job_id] ?? []
              )
                .sort((a, b) => {
                  return a.timestamp - b.timestamp;
                })
                .map((d, i: number) => {
                  d.key = (i + 1).toString();
                  return d;
                });
            }
          }

          if (forecastData) {
            refreshFocusData.focusForecastData = processForecastResults(forecastData.results);
            refreshFocusData.showForecastCheckbox = refreshFocusData.focusForecastData.length > 0;
          }
          return refreshFocusData;
        }
      )
    );
  }

  return {
    getAutoZoomDuration,
    calculateAggregationInterval,
    calculateInitialFocusRange,
    calculateDefaultFocusRange,
    processRecordScoreResults,
    processMetricPlotResults,
    processForecastResults,
    findChartPointForAnomalyTime,
    processDataForFocusAnomalies,
    findChartPointForScheduledEvent,
    processScheduledEventsForChart,
    getFocusData,
  };
}

export function useTimeSeriesExplorerService(): TimeSeriesExplorerService {
  const {
    services: {
      uiSettings,
      mlServices: { mlApiServices },
    },
  } = useMlKibana();
  const mlResultsService = mlResultsServiceProvider(mlApiServices);

  const mlTimeSeriesExplorer = useMemo(
    () => timeSeriesExplorerServiceFactory(uiSettings, mlApiServices, mlResultsService),
    [uiSettings, mlApiServices, mlResultsService]
  );
  return mlTimeSeriesExplorer;
}

export type TimeSeriesExplorerService = ReturnType<typeof timeSeriesExplorerServiceFactory>;
