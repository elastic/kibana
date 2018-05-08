/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Contains a number of utility functions used for processing
 * the data for exploring a time series in the Single Metric
 * Viewer dashboard.
 */

import _ from 'lodash';

import { parseInterval } from 'ui/utils/parse_interval';
import { isTimeSeriesViewJob } from 'plugins/ml/../common/util/job_utils';

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
// only time series view jobs are allowed
export function createTimeSeriesJobData(jobs) {
  const singleTimeSeriesJobs = jobs.filter(isTimeSeriesViewJob);
  return singleTimeSeriesJobs.map(job => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return {
      id: job.job_id,
      selected: false,
      bucketSpanSeconds: bucketSpan.asSeconds()
    };
  });
}

// Return dataset in format used by the single metric chart.
// i.e. array of Objects with keys date (JavaScript date) and value,
// plus lower and upper keys if model plot is enabled for the series.
export function processMetricPlotResults(metricPlotData, modelPlotEnabled) {
  const metricPlotChartData = [];
  if (modelPlotEnabled === true) {
    _.each(metricPlotData, (dataForTime, time) => {
      metricPlotChartData.push({
        date: new Date(+time),
        lower: dataForTime.modelLower,
        value: dataForTime.actual,
        upper: dataForTime.modelUpper
      });
    });
  } else {
    _.each(metricPlotData, (dataForTime, time) => {
      metricPlotChartData.push({
        date: new Date(+time),
        value: dataForTime.actual
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
  _.each(forecastData, (dataForTime, time) => {
    forecastPlotChartData.push({
      date: new Date(+time),
      isForecast: true,
      lower: dataForTime.forecastLower,
      value: dataForTime.prediction,
      upper: dataForTime.forecastUpper
    });
  });

  return forecastPlotChartData;
}

// Return dataset in format used by the swimlane.
// i.e. array of Objects with keys date (JavaScript date) and score.
export function processRecordScoreResults(scoreData) {
  const bucketScoreData = [];
  _.each(scoreData, (dataForTime, time) => {
    bucketScoreData.push(
      {
        date: new Date(+time),
        score: dataForTime.score,
      });
  });

  return bucketScoreData;
}

// Uses data from the list of anomaly records to add anomalyScore properties
// to the chartData entries for anomalous buckets.
export function processDataForFocusAnomalies(
  chartData,
  anomalyRecords,
  timeFieldName) {

  // Iterate through the anomaly records, adding anomalyScore properties
  // to the chartData entries for anomalous buckets.
  _.each(anomalyRecords, (record) => {

    // Look for a chart point with the same time as the record.
    // If none found, find closest time in chartData set.
    const recordTime = record[timeFieldName];
    let chartPoint = findNearestChartPointToTime(chartData, recordTime);

    // TODO - handle case where there is an anomaly due to the absense of data
    // and there is no model plot.
    if (chartPoint === undefined && chartData.length) {
      // In case there is a record with a time after that of the last chart point, set the score
      // for the last chart point to that of the last record, if that record has a higher score.
      const lastChartPoint = chartData[chartData.length - 1];
      const lastChartPointScore = lastChartPoint.anomalyScore || 0;
      if (record.record_score > lastChartPointScore) {
        chartPoint = lastChartPoint;
      }
    }

    if (chartPoint !== undefined) {
      // If chart aggregation interval > bucket span, there may be more than
      // one anomaly record in the interval, so get max record anomalyScore.
      chartPoint.anomalyScore = Math.max(_.get(chartPoint, 'anomalyScore', 0), record.record_score);
      chartPoint.function = record.function;

      if (_.has(record, 'actual')) {
        chartPoint.actual = record.actual;
        chartPoint.typical = record.typical;
      } else {
        const causes = _.get(record, 'causes', []);
        if (causes.length > 0) {
          chartPoint.byFieldName = record.by_field_name;
          chartPoint.numberOfCauses = causes.length;
          if (causes.length === 1) {
            // If only a single cause, copy actual and typical values to the top level.
            const cause = _.first(record.causes);
            chartPoint.actual = cause.actual;
            chartPoint.typical = cause.typical;
          }
        }
      }
    }

  });

  return chartData;
}

// Adds a scheduledEvents property to any points in the chart data set
// which correspond to times of scheduled events for the job.
export function processScheduledEventsForChart(chartData, scheduledEvents) {
  if (scheduledEvents !== undefined) {
    _.each(scheduledEvents, (events, time) => {
      const chartPoint = findNearestChartPointToTime(chartData, time);
      if (chartPoint !== undefined) {
        // Note if the scheduled event coincides with an absence of the underlying metric data,
        // we don't worry about plotting the event.
        chartPoint.scheduledEvents = events;
      }
    });
  }

  return chartData;
}

export function findNearestChartPointToTime(chartData, time) {
  let chartPoint;
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
      const itemTime = chartData[i].date.getTime();
      if (itemTime > time) {
        const item = chartData[i];
        const previousItem = chartData[i - 1];

        const diff1 = Math.abs(time - previousItem.date.getTime());
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
