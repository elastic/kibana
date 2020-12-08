/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Service for the container for the anomaly charts in the
 * Machine Learning Explorer dashboard.
 * The service processes the data required to draw each of the charts
 * and manages the layout of the charts in the containing div.
 */

import { get, each, find, sortBy, map, reduce } from 'lodash';

import { buildConfig } from './explorer_chart_config_builder';
import { chartLimits, getChartType } from '../../util/chart_utils';
import { getTimefilter } from '../../util/dependency_cache';

import { getEntityFieldList } from '../../../../common/util/anomaly_utils';
import {
  isSourceDataChartableForDetector,
  isModelPlotChartableForDetector,
  isModelPlotEnabled,
} from '../../../../common/util/job_utils';
import { mlResultsService } from '../../services/results_service';
import { mlJobService } from '../../services/job_service';
import { explorerService } from '../explorer_dashboard_service';

import { CHART_TYPE } from '../explorer_constants';
import { i18n } from '@kbn/i18n';

export function getDefaultChartsData() {
  return {
    chartsPerRow: 1,
    errorMessages: undefined,
    seriesToPlot: [],
    // default values, will update on every re-render
    tooManyBuckets: false,
    timeFieldName: 'timestamp',
  };
}

const CHART_MAX_POINTS = 500;
const ANOMALIES_MAX_RESULTS = 500;
const MAX_SCHEDULED_EVENTS = 10; // Max number of scheduled events displayed per bucket.
const ML_TIME_FIELD_NAME = 'timestamp';
const USE_OVERALL_CHART_LIMITS = false;
const MAX_CHARTS_PER_ROW = 4;

export const anomalyDataChange = function (
  chartsContainerWidth,
  anomalyRecords,
  selectedEarliestMs,
  selectedLatestMs,
  severity = 0
) {
  const data = getDefaultChartsData();

  const filteredRecords = anomalyRecords.filter((record) => {
    return Number(record.record_score) >= severity;
  });
  const [allSeriesRecords, errorMessages] = processRecordsForDisplay(filteredRecords);
  // Calculate the number of charts per row, depending on the width available, to a max of 4.
  let chartsPerRow = Math.min(
    Math.max(Math.floor(chartsContainerWidth / 550), 1),
    MAX_CHARTS_PER_ROW
  );
  if (allSeriesRecords.length === 1) {
    chartsPerRow = 1;
  }

  data.chartsPerRow = chartsPerRow;

  // Build the data configs of the anomalies to be displayed.
  // TODO - implement paging?
  // For now just take first 6 (or 8 if 4 charts per row).
  const maxSeriesToPlot = Math.max(chartsPerRow * 2, 6);
  const recordsToPlot = allSeriesRecords.slice(0, maxSeriesToPlot);
  const seriesConfigs = recordsToPlot.map(buildConfig);

  // Calculate the time range of the charts, which is a function of the chart width and max job bucket span.
  data.tooManyBuckets = false;
  const chartWidth = Math.floor(chartsContainerWidth / chartsPerRow);
  const { chartRange, tooManyBuckets } = calculateChartRange(
    seriesConfigs,
    selectedEarliestMs,
    selectedLatestMs,
    chartWidth,
    recordsToPlot,
    data.timeFieldName
  );
  data.tooManyBuckets = tooManyBuckets;

  // initialize the charts with loading indicators
  data.seriesToPlot = seriesConfigs.map((config) => ({
    ...config,
    loading: true,
    chartData: null,
  }));

  data.errorMessages = errorMessages;

  explorerService.setCharts({ ...data });

  if (seriesConfigs.length === 0) {
    return data;
  }

  // Query 1 - load the raw metric data.
  function getMetricData(config, range) {
    const { jobId, detectorIndex, entityFields, bucketSpanSeconds } = config;

    const job = mlJobService.getJob(jobId);

    // If the job uses aggregation or scripted fields, and if it's a config we don't support
    // use model plot data if model plot is enabled
    // else if source data can be plotted, use that, otherwise model plot will be available.
    const useSourceData = isSourceDataChartableForDetector(job, detectorIndex);
    if (useSourceData === true) {
      const datafeedQuery = get(config, 'datafeedConfig.query', null);
      return mlResultsService
        .getMetricData(
          config.datafeedConfig.indices,
          entityFields,
          datafeedQuery,
          config.metricFunction,
          config.metricFieldName,
          config.timeField,
          range.min,
          range.max,
          bucketSpanSeconds * 1000,
          config.datafeedConfig
        )
        .toPromise();
    } else {
      // Extract the partition, by, over fields on which to filter.
      const criteriaFields = [];
      const detector = job.analysis_config.detectors[detectorIndex];
      if (detector.partition_field_name !== undefined) {
        const partitionEntity = find(entityFields, {
          fieldName: detector.partition_field_name,
        });
        if (partitionEntity !== undefined) {
          criteriaFields.push(
            { fieldName: 'partition_field_name', fieldValue: partitionEntity.fieldName },
            { fieldName: 'partition_field_value', fieldValue: partitionEntity.fieldValue }
          );
        }
      }

      if (detector.over_field_name !== undefined) {
        const overEntity = find(entityFields, { fieldName: detector.over_field_name });
        if (overEntity !== undefined) {
          criteriaFields.push(
            { fieldName: 'over_field_name', fieldValue: overEntity.fieldName },
            { fieldName: 'over_field_value', fieldValue: overEntity.fieldValue }
          );
        }
      }

      if (detector.by_field_name !== undefined) {
        const byEntity = find(entityFields, { fieldName: detector.by_field_name });
        if (byEntity !== undefined) {
          criteriaFields.push(
            { fieldName: 'by_field_name', fieldValue: byEntity.fieldName },
            { fieldName: 'by_field_value', fieldValue: byEntity.fieldValue }
          );
        }
      }

      return new Promise((resolve, reject) => {
        const obj = {
          success: true,
          results: {},
        };

        return mlResultsService
          .getModelPlotOutput(
            jobId,
            detectorIndex,
            criteriaFields,
            range.min,
            range.max,
            bucketSpanSeconds * 1000
          )
          .toPromise()
          .then((resp) => {
            // Return data in format required by the explorer charts.
            const results = resp.results;
            Object.keys(results).forEach((time) => {
              obj.results[time] = results[time].actual;
            });
            resolve(obj);
          })
          .catch((resp) => {
            reject(resp);
          });
      });
    }
  }

  // Query 2 - load the anomalies.
  // Criteria to return the records for this series are the detector_index plus
  // the specific combination of 'entity' fields i.e. the partition / by / over fields.
  function getRecordsForCriteria(config, range) {
    let criteria = [];
    criteria.push({ fieldName: 'detector_index', fieldValue: config.detectorIndex });
    criteria = criteria.concat(config.entityFields);
    return mlResultsService
      .getRecordsForCriteria(
        [config.jobId],
        criteria,
        0,
        range.min,
        range.max,
        ANOMALIES_MAX_RESULTS
      )
      .toPromise();
  }

  // Query 3 - load any scheduled events for the job.
  function getScheduledEvents(config, range) {
    return mlResultsService
      .getScheduledEventsByBucket(
        [config.jobId],
        range.min,
        range.max,
        config.bucketSpanSeconds * 1000,
        1,
        MAX_SCHEDULED_EVENTS
      )
      .toPromise();
  }

  // Query 4 - load context data distribution
  function getEventDistribution(config, range) {
    const chartType = getChartType(config);

    let splitField;
    let filterField = null;

    // Define splitField and filterField based on chartType
    if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
      splitField = config.entityFields.find((f) => f.fieldType === 'by');
      filterField = config.entityFields.find((f) => f.fieldType === 'partition');
    } else if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
      splitField = config.entityFields.find((f) => f.fieldType === 'over');
      filterField = config.entityFields.find((f) => f.fieldType === 'partition');
    }

    const datafeedQuery = get(config, 'datafeedConfig.query', null);
    return mlResultsService.getEventDistributionData(
      config.datafeedConfig.indices,
      splitField,
      filterField,
      datafeedQuery,
      config.metricFunction,
      config.metricFieldName,
      config.timeField,
      range.min,
      range.max,
      config.bucketSpanSeconds * 1000
    );
  }

  // first load and wait for required data,
  // only after that trigger data processing and page render.
  // TODO - if query returns no results e.g. source data has been deleted,
  // display a message saying 'No data between earliest/latest'.
  const seriesPromises = seriesConfigs.map((seriesConfig) =>
    Promise.all([
      getMetricData(seriesConfig, chartRange),
      getRecordsForCriteria(seriesConfig, chartRange),
      getScheduledEvents(seriesConfig, chartRange),
      getEventDistribution(seriesConfig, chartRange),
    ])
  );

  function processChartData(response, seriesIndex) {
    const metricData = response[0].results;
    const records = response[1].records;
    const jobId = seriesConfigs[seriesIndex].jobId;
    const scheduledEvents = response[2].events[jobId];
    const eventDistribution = response[3];
    const chartType = getChartType(seriesConfigs[seriesIndex]);

    // Sort records in ascending time order matching up with chart data
    records.sort((recordA, recordB) => {
      return recordA[ML_TIME_FIELD_NAME] - recordB[ML_TIME_FIELD_NAME];
    });

    // Return dataset in format used by the chart.
    // i.e. array of Objects with keys date (timestamp), value,
    //    plus anomalyScore for points with anomaly markers.
    let chartData = [];
    if (metricData !== undefined) {
      if (eventDistribution.length > 0 && records.length > 0) {
        const filterField = records[0].by_field_value || records[0].over_field_value;
        chartData = eventDistribution.filter((d) => d.entity !== filterField);
        map(metricData, (value, time) => {
          // The filtering for rare/event_distribution charts needs to be handled
          // differently because of how the source data is structured.
          // For rare chart values we are only interested wether a value is either `0` or not,
          // `0` acts like a flag in the chart whether to display the dot/marker.
          // All other charts (single metric, population) are metric based and with
          // those a value of `null` acts as the flag to hide a data point.
          if (
            (chartType === CHART_TYPE.EVENT_DISTRIBUTION && value > 0) ||
            (chartType !== CHART_TYPE.EVENT_DISTRIBUTION && value !== null)
          ) {
            chartData.push({
              date: +time,
              value: value,
              entity: filterField,
            });
          }
        });
      } else {
        chartData = map(metricData, (value, time) => ({
          date: +time,
          value: value,
        }));
      }
    }

    // Iterate through the anomaly records, adding anomalyScore properties
    // to the chartData entries for anomalous buckets.
    const chartDataForPointSearch = getChartDataForPointSearch(chartData, records[0], chartType);
    each(records, (record) => {
      // Look for a chart point with the same time as the record.
      // If none found, insert a point for anomalies due to a gap in the data.
      const recordTime = record[ML_TIME_FIELD_NAME];
      let chartPoint = findChartPointForTime(chartDataForPointSearch, recordTime);
      if (chartPoint === undefined) {
        chartPoint = { date: new Date(recordTime), value: null };
        chartData.push(chartPoint);
      }

      chartPoint.anomalyScore = record.record_score;

      if (record.actual !== undefined) {
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
          }
        }
      }

      if (record.multi_bucket_impact !== undefined) {
        chartPoint.multiBucketImpact = record.multi_bucket_impact;
      }
    });

    // Add a scheduledEvents property to any points in the chart data set
    // which correspond to times of scheduled events for the job.
    if (scheduledEvents !== undefined) {
      each(scheduledEvents, (events, time) => {
        const chartPoint = findChartPointForTime(chartDataForPointSearch, Number(time));
        if (chartPoint !== undefined) {
          // Note if the scheduled event coincides with an absence of the underlying metric data,
          // we don't worry about plotting the event.
          chartPoint.scheduledEvents = events;
        }
      });
    }

    return chartData;
  }

  function getChartDataForPointSearch(chartData, record, chartType) {
    if (
      chartType === CHART_TYPE.EVENT_DISTRIBUTION ||
      chartType === CHART_TYPE.POPULATION_DISTRIBUTION
    ) {
      return chartData.filter((d) => {
        return d.entity === (record && (record.by_field_value || record.over_field_value));
      });
    }

    return chartData;
  }

  function findChartPointForTime(chartData, time) {
    return chartData.find((point) => point.date === time);
  }

  Promise.all(seriesPromises)
    .then((response) => {
      // calculate an overall min/max for all series
      const processedData = response.map(processChartData);
      const allDataPoints = reduce(
        processedData,
        (datapoints, series) => {
          each(series, (d) => datapoints.push(d));
          return datapoints;
        },
        []
      );
      const overallChartLimits = chartLimits(allDataPoints);

      data.seriesToPlot = response.map((d, i) => ({
        ...seriesConfigs[i],
        loading: false,
        chartData: processedData[i],
        plotEarliest: chartRange.min,
        plotLatest: chartRange.max,
        selectedEarliest: selectedEarliestMs,
        selectedLatest: selectedLatestMs,
        chartLimits: USE_OVERALL_CHART_LIMITS ? overallChartLimits : chartLimits(processedData[i]),
      }));
      explorerService.setCharts({ ...data });
    })
    .catch((error) => {
      console.error(error);
    });
};

function processRecordsForDisplay(anomalyRecords) {
  // Aggregate the anomaly data by detector, and entity (by/over/partition).
  if (anomalyRecords.length === 0) {
    return [[], undefined];
  }

  // Aggregate by job, detector, and analysis fields (partition, by, over).
  const aggregatedData = {};

  const jobsErrorMessage = {};
  each(anomalyRecords, (record) => {
    // Check if we can plot a chart for this record, depending on whether the source data
    // is chartable, and if model plot is enabled for the job.
    const job = mlJobService.getJob(record.job_id);

    // if we already know this job has datafeed aggregations we cannot support
    // no need to do more checks
    if (jobsErrorMessage[record.job_id] !== undefined) {
      return;
    }

    let isChartable = isSourceDataChartableForDetector(job, record.detector_index);
    if (isChartable === false) {
      if (isModelPlotChartableForDetector(job, record.detector_index)) {
        // Check if model plot is enabled for this job.
        // Need to check the entity fields for the record in case the model plot config has a terms list.
        const entityFields = getEntityFieldList(record);
        if (isModelPlotEnabled(job, record.detector_index, entityFields)) {
          isChartable = true;
        } else {
          isChartable = false;
          jobsErrorMessage[record.job_id] = i18n.translate(
            'xpack.ml.timeSeriesJob.sourceDataNotChartableWithDisabledModelPlotMessage',
            {
              defaultMessage:
                'source data is not viewable for this detector and model plot is disabled',
            }
          );
        }
      } else {
        jobsErrorMessage[record.job_id] = i18n.translate(
          'xpack.ml.timeSeriesJob.sourceDataModelPlotNotChartableMessage',
          {
            defaultMessage: 'both source data and model plot are not chartable for this detector',
          }
        );
      }
    }

    if (isChartable === false) {
      return;
    }
    const jobId = record.job_id;
    if (aggregatedData[jobId] === undefined) {
      aggregatedData[jobId] = {};
    }
    const detectorsForJob = aggregatedData[jobId];

    const detectorIndex = record.detector_index;
    if (detectorsForJob[detectorIndex] === undefined) {
      detectorsForJob[detectorIndex] = {};
    }

    // TODO - work out how best to display results from detectors with just an over field.
    const firstFieldName =
      record.partition_field_name || record.by_field_name || record.over_field_name;
    const firstFieldValue =
      record.partition_field_value || record.by_field_value || record.over_field_value;
    if (firstFieldName !== undefined) {
      const groupsForDetector = detectorsForJob[detectorIndex];

      if (groupsForDetector[firstFieldName] === undefined) {
        groupsForDetector[firstFieldName] = {};
      }
      const valuesForGroup = groupsForDetector[firstFieldName];
      if (valuesForGroup[firstFieldValue] === undefined) {
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
        if (dataForGroupValue.maxScoreRecord === undefined) {
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

        if (dataForGroupValue[secondFieldName] === undefined) {
          dataForGroupValue[secondFieldName] = {};
        }

        const splitsForGroup = dataForGroupValue[secondFieldName];
        if (splitsForGroup[secondFieldValue] === undefined) {
          splitsForGroup[secondFieldValue] = {};
        }

        const dataForSplitValue = splitsForGroup[secondFieldValue];
        if (dataForSplitValue.maxScoreRecord === undefined) {
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
      if (dataForDetector.maxScoreRecord === undefined) {
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

  // Group job id by error message instead of by job:
  const errorMessages = {};
  Object.keys(jobsErrorMessage).forEach((jobId) => {
    const msg = jobsErrorMessage[jobId];
    if (errorMessages[msg] === undefined) {
      errorMessages[msg] = new Set([jobId]);
    } else {
      errorMessages[msg].add(jobId);
    }
  });
  let recordsForSeries = [];
  // Convert to an array of the records with the highest record_score per unique series.
  each(aggregatedData, (detectorsForJob) => {
    each(detectorsForJob, (groupsForDetector) => {
      if (groupsForDetector.errorMessage !== undefined) {
        recordsForSeries.push(groupsForDetector.errorMessage);
      } else {
        if (groupsForDetector.maxScoreRecord !== undefined) {
          // Detector with no partition / by field.
          recordsForSeries.push(groupsForDetector.maxScoreRecord);
        } else {
          each(groupsForDetector, (valuesForGroup) => {
            each(valuesForGroup, (dataForGroupValue) => {
              if (dataForGroupValue.maxScoreRecord !== undefined) {
                recordsForSeries.push(dataForGroupValue.maxScoreRecord);
              } else {
                // Second level of aggregation for partition and by/over.
                each(dataForGroupValue, (splitsForGroup) => {
                  each(splitsForGroup, (dataForSplitValue) => {
                    recordsForSeries.push(dataForSplitValue.maxScoreRecord);
                  });
                });
              }
            });
          });
        }
      }
    });
  });
  recordsForSeries = sortBy(recordsForSeries, 'record_score').reverse();

  return [recordsForSeries, errorMessages];
}

function calculateChartRange(
  seriesConfigs,
  selectedEarliestMs,
  selectedLatestMs,
  chartWidth,
  recordsToPlot,
  timeFieldName
) {
  let tooManyBuckets = false;
  // Calculate the time range for the charts.
  // Fit in as many points in the available container width plotted at the job bucket span.
  // Look for the chart with the shortest bucket span as this determines
  // the length of the time range that can be plotted.
  const midpointMs = Math.ceil((selectedEarliestMs + selectedLatestMs) / 2);
  const minBucketSpanMs = Math.min.apply(null, map(seriesConfigs, 'bucketSpanSeconds')) * 1000;
  const maxBucketSpanMs = Math.max.apply(null, map(seriesConfigs, 'bucketSpanSeconds')) * 1000;

  const pointsToPlotFullSelection = Math.ceil(
    (selectedLatestMs - selectedEarliestMs) / minBucketSpanMs
  );

  // Optimally space points 5px apart.
  const optimumPointSpacing = 5;
  const optimumNumPoints = chartWidth / optimumPointSpacing;

  // Increase actual number of points if we can't plot the selected range
  // at optimal point spacing.
  const plotPoints = Math.max(optimumNumPoints, pointsToPlotFullSelection);
  const halfPoints = Math.ceil(plotPoints / 2);
  const timefilter = getTimefilter();
  const bounds = timefilter.getActiveBounds();
  const boundsMin = bounds.min.valueOf();

  let chartRange = {
    min: Math.max(midpointMs - halfPoints * minBucketSpanMs, boundsMin),
    max: Math.min(midpointMs + halfPoints * minBucketSpanMs, bounds.max.valueOf()),
  };

  if (plotPoints > CHART_MAX_POINTS) {
    // For each series being plotted, display the record with the highest score if possible.
    const maxTimeSpan = minBucketSpanMs * CHART_MAX_POINTS;
    let minMs = recordsToPlot[0][timeFieldName];
    let maxMs = recordsToPlot[0][timeFieldName];

    each(recordsToPlot, (record) => {
      const diffMs = maxMs - minMs;
      if (diffMs < maxTimeSpan) {
        const recordTime = record[timeFieldName];
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

    if (maxMs - minMs < maxTimeSpan) {
      // Expand out before and after the span with the highest scoring anomalies,
      // covering as much as the requested time span as possible.
      // Work out if the high scoring region is nearer the start or end of the selected time span.
      const diff = maxTimeSpan - (maxMs - minMs);
      if (minMs - 0.5 * diff <= selectedEarliestMs) {
        minMs = Math.max(selectedEarliestMs, minMs - 0.5 * diff);
        maxMs = minMs + maxTimeSpan;
      } else {
        maxMs = Math.min(selectedLatestMs, maxMs + 0.5 * diff);
        minMs = maxMs - maxTimeSpan;
      }
    }

    chartRange = { min: minMs, max: maxMs };
  }

  // Elasticsearch aggregation returns points at start of bucket,
  // so align the min to the length of the longest bucket.
  chartRange.min = Math.floor(chartRange.min / maxBucketSpanMs) * maxBucketSpanMs;
  if (chartRange.min < boundsMin) {
    chartRange.min = chartRange.min + maxBucketSpanMs;
  }

  if (chartRange.min > selectedEarliestMs || chartRange.max < selectedLatestMs) {
    tooManyBuckets = true;
  }

  return {
    chartRange,
    tooManyBuckets,
  };
}
