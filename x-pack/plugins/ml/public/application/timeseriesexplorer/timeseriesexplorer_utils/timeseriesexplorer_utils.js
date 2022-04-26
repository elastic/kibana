/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Contains a number of utility functions used for processing
 * the data for exploring a time series in the Single Metric
 * Viewer dashboard.
 */

import { each, get, find } from 'lodash';
import moment from 'moment-timezone';

import { isTimeSeriesViewJob } from '../../../../common/util/job_utils';
import { parseInterval } from '../../../../common/util/parse_interval';

import { getBoundsRoundedToInterval, getTimeBucketsFromCache } from '../../util/time_buckets';

import { CHARTS_POINT_TARGET, TIME_FIELD_NAME } from '../timeseriesexplorer_constants';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
// only time series view jobs are allowed
export function createTimeSeriesJobData(jobs) {
  const singleTimeSeriesJobs = jobs.filter(isTimeSeriesViewJob);
  return singleTimeSeriesJobs.map((job) => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return {
      id: job.job_id,
      selected: false,
      bucketSpanSeconds: bucketSpan.asSeconds(),
    };
  });
}

// Return dataset in format used by the single metric chart.
// i.e. array of Objects with keys date (JavaScript date) and value,
// plus lower and upper keys if model plot is enabled for the series.
export function processMetricPlotResults(metricPlotData, modelPlotEnabled) {
  const metricPlotChartData = [];
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
export function processForecastResults(forecastData) {
  const forecastPlotChartData = [];
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

// Return dataset in format used by the swimlane.
// i.e. array of Objects with keys date (JavaScript date) and score.
export function processRecordScoreResults(scoreData) {
  const bucketScoreData = [];
  each(scoreData, (dataForTime, time) => {
    bucketScoreData.push({
      date: new Date(+time),
      score: dataForTime.score,
    });
  });

  return bucketScoreData;
}

// Uses data from the list of anomaly records to add anomalyScore,
// function, actual and typical properties, plus causes and multi-bucket
// info if applicable, to the chartData entries for anomalous buckets.
export function processDataForFocusAnomalies(
  chartData,
  anomalyRecords,
  aggregationInterval,
  modelPlotEnabled,
  functionDescription
) {
  const timesToAddPointsFor = [];

  // Iterate through the anomaly records making sure we have chart points for each anomaly.
  const intervalMs = aggregationInterval.asMilliseconds();
  let lastChartDataPointTime = undefined;
  if (chartData !== undefined && chartData.length > 0) {
    lastChartDataPointTime = chartData[chartData.length - 1].date.getTime();
  }
  anomalyRecords.forEach((record) => {
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
    const pointToAdd = {
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
          if (chartPoint.value === null) {
            chartPoint.value = record.actual;
          }

          if (record.function === ML_JOB_AGGREGATION.METRIC) {
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
              const cause = record.causes[0];
              chartPoint.actual = cause.actual;
              chartPoint.typical = cause.typical;
              // substitute the value with the record's actual so it won't plot as null/0
              if (chartPoint.value === null) {
                chartPoint.value = cause.actual;
              }
            }
          }
        }

        if (record.multi_bucket_impact !== undefined) {
          chartPoint.multiBucketImpact = record.multi_bucket_impact;
        }
      }
    }
  });

  return chartData;
}

// Adds a scheduledEvents property to any points in the chart data set
// which correspond to times of scheduled events for the job.
export function processScheduledEventsForChart(chartData, scheduledEvents, aggregationInterval) {
  if (scheduledEvents !== undefined) {
    const timesToAddPointsFor = [];

    // Iterate through the scheduled events making sure we have a chart point for each event.
    const intervalMs = aggregationInterval.asMilliseconds();
    let lastChartDataPointTime = undefined;
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
        const timeToAdd = Math.floor(time / intervalMs) * intervalMs;
        if (timesToAddPointsFor.indexOf(timeToAdd) === -1 && timeToAdd !== lastChartDataPointTime) {
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
    if (sortRequired === true) {
      chartData.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }

  return chartData;
}

// Finds the chart point which is closest in time to the specified time.
export function findNearestChartPointToTime(chartData, time) {
  let chartPoint;
  if (chartData === undefined) {
    return chartPoint;
  }

  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].date.getTime() === time) {
      chartPoint = chartData[i];
      break;
    }
  }

  if (chartPoint === undefined) {
    // Find nearest point in time.
    // loop through line items until the date is greater than bucketTime
    // grab the current and previous items and compare the time differences
    let foundItem;
    for (let i = 0; i < chartData.length; i++) {
      const itemTime = chartData[i]?.date?.getTime();
      if (itemTime > time) {
        const item = chartData[i];
        const previousItem = chartData[i - 1];

        const diff1 = Math.abs(time - previousItem?.date?.getTime());
        const diff2 = Math.abs(time - itemTime);

        // foundItem should be the item with a date closest to bucketTime
        if (previousItem === undefined || diff1 > diff2) {
          foundItem = item;
        } else {
          foundItem = previousItem;
        }

        break;
      }
    }

    chartPoint = foundItem;
  }

  return chartPoint;
}

// Finds the chart point which corresponds to an anomaly with the
// specified time.
export function findChartPointForAnomalyTime(chartData, anomalyTime, aggregationInterval) {
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

export function findChartPointForScheduledEvent(chartData, eventTime) {
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

export function calculateAggregationInterval(bounds, bucketsTarget, jobs, selectedJob) {
  // Aggregation interval used in queries should be a function of the time span of the chart
  // and the bucket span of the selected job(s).
  const barTarget = bucketsTarget !== undefined ? bucketsTarget : 100;
  // Use a maxBars of 10% greater than the target.
  const maxBars = Math.floor(1.1 * barTarget);
  const buckets = getTimeBucketsFromCache();
  buckets.setInterval('auto');
  buckets.setBounds(bounds);
  buckets.setBarTarget(Math.floor(barTarget));
  buckets.setMaxBars(maxBars);

  // Ensure the aggregation interval is always a multiple of the bucket span to avoid strange
  // behaviour such as adjacent chart buckets holding different numbers of job results.
  const bucketSpanSeconds = find(jobs, { id: selectedJob.job_id }).bucketSpanSeconds;
  let aggInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);

  // Set the interval back to the job bucket span if the auto interval is smaller.
  const secs = aggInterval.asSeconds();
  if (secs < bucketSpanSeconds) {
    buckets.setInterval(bucketSpanSeconds + 's');
    aggInterval = buckets.getInterval();
  }

  return aggInterval;
}

export function calculateDefaultFocusRange(
  autoZoomDuration,
  contextAggregationInterval,
  contextChartData,
  contextForecastData
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

export function calculateInitialFocusRange(zoomState, contextAggregationInterval, bounds) {
  if (zoomState !== undefined) {
    // Check that the zoom times are valid.
    // zoomFrom must be at or after context chart search bounds earliest,
    // zoomTo must be at or before context chart search bounds latest.
    const zoomFrom = moment(zoomState.from, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
    const zoomTo = moment(zoomState.to, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
    const searchBounds = getBoundsRoundedToInterval(bounds, contextAggregationInterval, true);
    const earliest = searchBounds.min;
    const latest = searchBounds.max;

    if (
      zoomFrom.isValid() &&
      zoomTo.isValid &&
      zoomTo.isAfter(zoomFrom) &&
      zoomFrom.isBetween(earliest, latest, null, '[]') &&
      zoomTo.isBetween(earliest, latest, null, '[]')
    ) {
      return [zoomFrom.toDate(), zoomTo.toDate()];
    }
  }

  return undefined;
}

export function getAutoZoomDuration(jobs, selectedJob) {
  // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
  // Get the minimum bucket span of selected jobs.
  // TODO - only look at jobs for which data has been returned?
  const bucketSpanSeconds = find(jobs, { id: selectedJob.job_id }).bucketSpanSeconds;

  // In most cases the duration can be obtained by simply multiplying the points target
  // Check that this duration returns the bucket span when run back through the
  // TimeBucket interval calculation.
  let autoZoomDuration = bucketSpanSeconds * 1000 * (CHARTS_POINT_TARGET - 1);

  // Use a maxBars of 10% greater than the target.
  const maxBars = Math.floor(1.1 * CHARTS_POINT_TARGET);
  const buckets = getTimeBucketsFromCache();
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
