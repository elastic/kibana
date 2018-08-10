/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Angular controller for the container for the anomaly charts in the
 * Machine Learning Explorer dashboard.
 * The controller processes the data required to draw each of the charts
 * and manages the layout of the charts in the containing div.
 */

import _ from 'lodash';
import $ from 'jquery';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');
import { explorerChartConfigBuilder } from './explorer_chart_config_builder';
import { chartLimits } from 'plugins/ml/util/chart_utils';
import { isTimeSeriesViewDetector } from 'plugins/ml/../common/util/job_utils';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { mlJobService } from 'plugins/ml/services/job_service';

module.controller('MlExplorerChartsContainerController', function ($scope, $injector) {
  const Private = $injector.get('Private');
  const mlExplorerDashboardService = $injector.get('mlExplorerDashboardService');
  const mlSelectSeverityService = $injector.get('mlSelectSeverityService');

  $scope.seriesToPlot = [];

  const $chartContainer = $('.explorer-charts');
  const FUNCTION_DESCRIPTIONS_TO_PLOT = ['mean', 'min', 'max', 'sum', 'count', 'distinct_count', 'median', 'rare'];
  const CHART_MAX_POINTS = 500;
  const ANOMALIES_MAX_RESULTS = 500;
  const MAX_SCHEDULED_EVENTS = 10;          // Max number of scheduled events displayed per bucket.
  const ML_TIME_FIELD_NAME = 'timestamp';
  const USE_OVERALL_CHART_LIMITS = false;

  const anomalyDataChangeListener = function (anomalyRecords, earliestMs, latestMs) {
    const threshold = mlSelectSeverityService.state.get('threshold');
    const filteredRecords = _.filter(anomalyRecords, (record) => {
      return Number(record.record_score) >= threshold.val;
    });
    const allSeriesRecords = processRecordsForDisplay(filteredRecords);
    // Calculate the number of charts per row, depending on the width available, to a max of 4.
    const chartsContainerWidth = $chartContainer.width();
    const chartsPerRow = Math.min(Math.max(Math.floor(chartsContainerWidth / 550), 1), 4);

    $scope.chartsPerRow = chartsPerRow;
    $scope.layoutCellsPerChart = 12 / $scope.chartsPerRow;

    // Build the data configs of the anomalies to be displayed.
    // TODO - implement paging?
    // For now just take first 6 (or 8 if 4 charts per row).
    const maxSeriesToPlot = Math.max(chartsPerRow * 2, 6);
    const recordsToPlot = allSeriesRecords.slice(0, maxSeriesToPlot);
    const seriesConfigs = buildDataConfigs(recordsToPlot);

    // Calculate the time range of the charts, which is a function of the chart width and max job bucket span.
    $scope.tooManyBuckets = false;
    const chartRange = calculateChartRange(seriesConfigs, earliestMs, latestMs,
      Math.floor(chartsContainerWidth / chartsPerRow), recordsToPlot);

    // initialize the charts with loading indicators
    $scope.seriesToPlot = seriesConfigs.map(config => ({
      ...config,
      loading: true,
      chartData: null
    }));

    // Query 1 - load the raw metric data.
    function getMetricData(config, range) {
      const datafeedQuery = _.get(config, 'datafeedConfig.query', null);
      return mlResultsService.getMetricData(
        config.datafeedConfig.indices,
        config.datafeedConfig.types,
        config.entityFields,
        datafeedQuery,
        config.metricFunction,
        config.metricFieldName,
        config.timeField,
        range.min,
        range.max,
        config.interval
      );
    }

    // Query 2 - load the anomalies.
    // Criteria to return the records for this series are the detector_index plus
    // the specific combination of 'entity' fields i.e. the partition / by / over fields.
    function getRecordsForCriteria(config, range) {
      let criteria = [];
      criteria.push({ fieldName: 'detector_index', fieldValue: config.detectorIndex });
      criteria = criteria.concat(config.entityFields);
      return mlResultsService.getRecordsForCriteria(
        [config.jobId],
        criteria,
        0,
        range.min,
        range.max,
        ANOMALIES_MAX_RESULTS
      );
    }

    // Query 3 - load any scheduled events for the job.
    function getScheduledEvents(config, range) {
      return mlResultsService.getScheduledEventsByBucket(
        [config.jobId],
        range.min,
        range.max,
        config.interval,
        1,
        MAX_SCHEDULED_EVENTS
      );
    }

    // first load and wait for required data,
    // only after that trigger data processing and page render.
    // TODO - if query returns no results e.g. source data has been deleted,
    // display a message saying 'No data between earliest/latest'.
    const seriesPromises = seriesConfigs.map(seriesConfig => Promise.all([
      getMetricData(seriesConfig, chartRange),
      getRecordsForCriteria(seriesConfig, chartRange),
      getScheduledEvents(seriesConfig, chartRange)
    ]));

    function processChartData(response, seriesIndex) {
      const metricData = response[0].results;
      const records = response[1].records;
      const jobId = seriesConfigs[seriesIndex].jobId;
      const scheduledEvents = response[2].events[jobId];

      // Return dataset in format used by the chart.
      // i.e. array of Objects with keys date (timestamp), value,
      //    plus anomalyScore for points with anomaly markers.
      if (metricData === undefined || _.keys(metricData).length === 0) {
        return [];
      }

      const chartData = _.map(metricData, (value, time) => ({
        date: +time,
        value: value
      }));
      // Iterate through the anomaly records, adding anomalyScore properties
      // to the chartData entries for anomalous buckets.
      _.each(records, (record) => {

        // Look for a chart point with the same time as the record.
        // If none found, find closest time in chartData set.
        const recordTime = record[ML_TIME_FIELD_NAME];
        let chartPoint = findNearestChartPointToTime(chartData, recordTime);

        if (chartPoint === undefined) {
          // In case there is a record with a time after that of the last chart point, set the score
          // for the last chart point to that of the last record, if that record has a higher score.
          const lastChartPoint = chartData[chartData.length - 1];
          const lastChartPointScore = lastChartPoint.anomalyScore || 0;
          if (record.record_score > lastChartPointScore) {
            chartPoint = lastChartPoint;
          }
        }

        if (chartPoint !== undefined) {
          chartPoint.anomalyScore = record.record_score;

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

      // Add a scheduledEvents property to any points in the chart data set
      // which correspond to times of scheduled events for the job.
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

    function findNearestChartPointToTime(chartData, time) {
      let chartPoint;
      for (let i = 0; i < chartData.length; i++) {
        if (chartData[i].date === time) {
          chartPoint = chartData[i];
          break;
        }
      }

      if (chartPoint === undefined) {
        // Find nearest point in time.
        // loop through line items until the date is greater than bucketTime
        // grab the current and previous items in the and compare the time differences
        let foundItem;
        for (let i = 0; i < chartData.length; i++) {
          const itemTime = chartData[i].date;
          if ((itemTime > time) && (i > 0)) {
            const item = chartData[i];
            const previousItem = (i > 0 ? chartData[i - 1] : null);

            const diff1 = Math.abs(time - previousItem.date);
            const diff2 = Math.abs(time - itemTime);

            // foundItem should be the item with a date closest to bucketTime
            if (previousItem === null || diff1 > diff2) {
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

    Promise.all(seriesPromises)
      .then(response => {
        // calculate an overall min/max for all series
        const processedData = response.map(processChartData);
        const allDataPoints = _.reduce(processedData, (datapoints, series) => {
          _.each(series, d => datapoints.push(d));
          return datapoints;
        }, []);
        const overallChartLimits = chartLimits(allDataPoints);

        $scope.seriesToPlot = response.map((d, i) => ({
          ...seriesConfigs[i],
          loading: false,
          chartData: processedData[i],
          plotEarliest: chartRange.min,
          plotLatest: chartRange.max,
          selectedEarliest: earliestMs,
          selectedLatest: latestMs,
          chartLimits: USE_OVERALL_CHART_LIMITS ? overallChartLimits : chartLimits(processedData[i])
        }));
      })
      .catch(error => {
        console.error(error);
      });
  };

  mlExplorerDashboardService.anomalyDataChange.watch(anomalyDataChangeListener);

  $scope.$on('$destroy', () => {
    mlExplorerDashboardService.anomalyDataChange.unwatch(anomalyDataChangeListener);
  });

  function processRecordsForDisplay(anomalyRecords) {
    // Aggregate the anomaly data by detector, and entity (by/over/partition).
    if (anomalyRecords.length === 0) {
      return [];
    }

    // Aggregate by job, detector, and analysis fields (partition, by, over).
    const aggregatedData = {};
    _.each(anomalyRecords, (record) => {
      // Only plot charts for metric functions, and for detectors which don't use categorization
      // or scripted fields which can be very difficult or impossible to invert to a reverse search.
      const job = mlJobService.getJob(record.job_id);
      if (
        isTimeSeriesViewDetector(job, record.detector_index) === false ||
        FUNCTION_DESCRIPTIONS_TO_PLOT.includes(record.function_description) === false
      ) {
        return;
      }
      const jobId = record.job_id;
      if (!_.has(aggregatedData, jobId)) {
        aggregatedData[jobId] = {};
      }
      const detectorsForJob = aggregatedData[jobId];

      const detectorIndex = record.detector_index;
      if (!_.has(detectorsForJob, detectorIndex)) {
        detectorsForJob[detectorIndex] = {};
      }

      // TODO - work out how best to display results from detectors with just an over field.
      const firstFieldName = record.partition_field_name || record.by_field_name || record.over_field_name;
      const firstFieldValue = record.partition_field_value || record.by_field_value || record.over_field_value;
      if (firstFieldName !== undefined) {
        const groupsForDetector = detectorsForJob[detectorIndex];

        if (!_.has(groupsForDetector, firstFieldName)) {
          groupsForDetector[firstFieldName] = {};
        }
        const valuesForGroup = groupsForDetector[firstFieldName];
        if (!_.has(valuesForGroup, firstFieldValue)) {
          valuesForGroup[firstFieldValue] = {};
        }

        const dataForGroupValue = valuesForGroup[firstFieldValue];

        let isSecondSplit = false;
        if (record.partition_field_name !== undefined) {
          const splitFieldName = record.over_field_name || record.by_field_name;
          if (splitFieldName !== undefined) {
            isSecondSplit = true;
          }
        }

        if (isSecondSplit === false) {
          if (!_.has(dataForGroupValue, 'maxScoreRecord')) {
            dataForGroupValue.maxScore = record.record_score;
            dataForGroupValue.maxScoreRecord = record;
          } else {
            if (record.record_score > dataForGroupValue.maxScore) {
              dataForGroupValue.maxScore = record.record_score;
              dataForGroupValue.maxScoreRecord = record;
            }
          }
        } else {
          // Aggregate another level for the over or by field.
          const secondFieldName = record.over_field_name || record.by_field_name;
          const secondFieldValue = record.over_field_value || record.by_field_value;

          if (!_.has(dataForGroupValue, secondFieldName)) {
            dataForGroupValue[secondFieldName] = {};
          }

          const splitsForGroup = dataForGroupValue[secondFieldName];
          if (!_.has(splitsForGroup, secondFieldValue)) {
            splitsForGroup[secondFieldValue] = {};
          }

          const dataForSplitValue = splitsForGroup[secondFieldValue];
          if (!_.has(dataForSplitValue, 'maxScoreRecord')) {
            dataForSplitValue.maxScore = record.record_score;
            dataForSplitValue.maxScoreRecord = record;
          } else {
            if (record.record_score > dataForSplitValue.maxScore) {
              dataForSplitValue.maxScore = record.record_score;
              dataForSplitValue.maxScoreRecord = record;
            }
          }
        }
      } else {
        // Detector with no partition or by field.
        const dataForDetector = detectorsForJob[detectorIndex];
        if (!_.has(dataForDetector, 'maxScoreRecord')) {
          dataForDetector.maxScore = record.record_score;
          dataForDetector.maxScoreRecord = record;
        } else {
          if (record.record_score > dataForDetector.maxScore) {
            dataForDetector.maxScore = record.record_score;
            dataForDetector.maxScoreRecord = record;
          }
        }
      }

    });

    console.log('explorer charts aggregatedData is:', aggregatedData);
    let recordsForSeries = [];
    // Convert to an array of the records with the highest record_score per unique series.
    _.each(aggregatedData, (detectorsForJob) => {
      _.each(detectorsForJob, (groupsForDetector) => {
        if (_.has(groupsForDetector, 'maxScoreRecord')) {
          // Detector with no partition / by field.
          recordsForSeries.push(groupsForDetector.maxScoreRecord);
        } else {
          _.each(groupsForDetector, (valuesForGroup) => {
            _.each(valuesForGroup, (dataForGroupValue) => {
              if (_.has(dataForGroupValue, 'maxScoreRecord')) {
                recordsForSeries.push(dataForGroupValue.maxScoreRecord);
              } else {
                // Second level of aggregation for partition and by/over.
                _.each(dataForGroupValue, (splitsForGroup) => {
                  _.each(splitsForGroup, (dataForSplitValue) => {
                    recordsForSeries.push(dataForSplitValue.maxScoreRecord);
                  });
                });
              }
            });
          });
        }
      });
    });
    recordsForSeries = (_.sortBy(recordsForSeries, 'record_score')).reverse();

    return recordsForSeries;
  }

  function buildDataConfigs(anomalyRecords) {
    // Build the chart configuration for each anomaly record.
    const configBuilder = Private(explorerChartConfigBuilder);
    return anomalyRecords.map(configBuilder.buildConfig);
  }

  function calculateChartRange(seriesConfigs, earliestMs, latestMs, chartWidth, recordsToPlot) {
    // Calculate the time range for the charts.
    // Fit in as many points in the available container width plotted at the job bucket span.
    const midpointMs = Math.ceil((earliestMs + latestMs) / 2);
    const maxBucketSpanMs = Math.max.apply(null, _.pluck(seriesConfigs, 'bucketSpanSeconds')) * 1000;

    const pointsToPlotFullSelection = Math.ceil((latestMs - earliestMs) / maxBucketSpanMs);

    // Optimally space points 5px apart.
    const optimumPointSpacing = 5;
    const optimumNumPoints = chartWidth / optimumPointSpacing;

    // Increase actual number of points if we can't plot the selected range
    // at optimal point spacing.
    const plotPoints = Math.max(optimumNumPoints, pointsToPlotFullSelection);
    const halfPoints = Math.ceil(plotPoints / 2);
    let chartRange =  { min: midpointMs - (halfPoints * maxBucketSpanMs),
      max: midpointMs + (halfPoints * maxBucketSpanMs) };

    if (plotPoints > CHART_MAX_POINTS) {
      $scope.tooManyBuckets = true;
      // For each series being plotted, display the record with the highest score if possible.
      const maxTimeSpan = maxBucketSpanMs * CHART_MAX_POINTS;
      let minMs = recordsToPlot[0][$scope.timeFieldName];
      let maxMs = recordsToPlot[0][$scope.timeFieldName];

      _.each(recordsToPlot, (record) => {
        const diffMs = maxMs - minMs;
        if (diffMs < maxTimeSpan) {
          const recordTime = record[$scope.timeFieldName];
          if (recordTime < minMs) {
            if (maxMs - recordTime <= maxTimeSpan) {
              minMs = recordTime;
            }
          }

          if (recordTime > maxMs) {
            if (recordTime - minMs <= maxTimeSpan) {
              maxMs = recordTime;
            }
          }
        }
      });

      if ((maxMs - minMs) < maxTimeSpan) {
        // Expand out to cover as much as the requested time span as possible.
        minMs = Math.max(earliestMs, maxMs - maxTimeSpan);
        maxMs = Math.min(latestMs, minMs + maxTimeSpan);
      }

      chartRange = { min: minMs, max: maxMs };
    }

    return chartRange;
  }

});
