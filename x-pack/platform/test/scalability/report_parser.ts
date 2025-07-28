/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import { ScalabilitySetup, ResponseTimeMetric } from '@kbn/journeys';
import { CapacityMetrics, DataPoint, ResponseMetric, RpsMetric } from './types';

const RESPONSE_METRICS_NAMES = [
  'min',
  '25%',
  '50%',
  '75%',
  '80%',
  '85%',
  '90%',
  '95%',
  '99%',
  'max',
];
const DEFAULT_THRESHOLD = {
  threshold1: 3000,
  threshold2: 6000,
  threshold3: 12000,
};
const DEFAULT_METRIC = '85%';
const REQUESTS_REGEXP = /(?<=var requests = unpack\(\[)(.*)(?=\]\);)/g;
const RESPONSES_PERCENTILES_REGEXP =
  /(?<=var responsetimepercentilesovertimeokPercentiles = unpack\(\[)(.*)(?=\]\);)/g;

/**
 * Returns Rps value for time point when response time is over threshold first time for specific metric
 * @param rpsData Rps dataset
 * @param responseTimeData Response time dataset
 * @param responseTimeThreshold Response time threshold
 * @param metricName Gatling response metric to compare with threshold
 * @param log logger
 * @returns
 */
const getRPSByResponseTime = (
  rpsData: RpsMetric[],
  responseTimeData: ResponseMetric[],
  responseTimeThreshold: number,
  metricName: ResponseTimeMetric,
  log: ToolingLog
) => {
  const timestamp = getTimePoint(responseTimeData, metricName, responseTimeThreshold, log);
  if (timestamp === -1) {
    // Data point was not found, most likely 'responseTimeThreshold' should be adjusted
    // Returning '0' as invalid result
    return 0;
  } else {
    const rps = rpsData.find((i) => i.timestamp === timestamp)?.value;
    // In edge case Gatling might fail to report requests for specific timestamp, returning '0' as invalid result
    return !rps ? 0 : rps;
  }
};

const parseData = (str: string, regex: RegExp) => {
  const found = str.match(regex);
  if (found == null) {
    throw Error('Failed to parse Html string');
  }
  return found[0]
    .replaceAll('],[', '].[')
    .split('.')
    .map((i) => {
      const pair = i
        .replaceAll(',[', '.[')
        .replaceAll(/^\[/g, '')
        .replaceAll(/\]$/g, '')
        .split('.');
      const arr = pair[1]?.replaceAll(/^\[/g, '')?.replaceAll(/\]$/g, '');
      const values: number[] = !arr ? [] : arr.split(',').map(Number);
      return { timestamp: parseInt(pair[0], 10), values };
    });
};

/**
 * Returns timestamp for the first response time entry above the threshold
 * @param data Response time dataset
 * @param metricName Gatling response metric to compare with threshold
 * @param responseTimeValue Response time threshold
 * @param log logger
 * @returns
 */
const getTimePoint = (
  data: ResponseMetric[],
  metricName: ResponseTimeMetric,
  responseTimeValue: number,
  log: ToolingLog
) => {
  const resultsAboveThreshold = data.filter((i) => i.metrics[metricName] >= responseTimeValue);
  if (resultsAboveThreshold.length === data.length) {
    log.debug(`Threshold '${responseTimeValue} is too low for '${metricName}' metric'`);
    return -1;
  } else if (resultsAboveThreshold.length === 0) {
    log.debug(`Threshold '${responseTimeValue} is too high for '${metricName}' metric'`);
    return -1;
  } else {
    return resultsAboveThreshold[0].timestamp;
  }
};

const mapValuesWithMetrics = (data: DataPoint[], metrics: string[]) => {
  return data
    .filter((i) => i.values.length === metrics.length)
    .map((i) => {
      return {
        timestamp: i.timestamp,
        metrics: Object.fromEntries(metrics.map((_, index) => [metrics[index], i.values[index]])),
      };
    });
};

export function getCapacityMetrics(
  htmlReportPath: string,
  scalabilitySetup: ScalabilitySetup,
  log: ToolingLog
): CapacityMetrics {
  const htmlContent = fs.readFileSync(htmlReportPath, 'utf-8');
  // [timestamp, [activeUsers,requests,0]], e.g. [1669026394,[6,6,0]]
  const requests = parseData(htmlContent, REQUESTS_REGEXP);
  // [timestamp, [min, 25%, 50%, 75%, 80%, 85%, 90%, 95%, 99%, max]], e.g. 1669026394,[9,11,11,12,13,13,14,15,15,16]
  const responsePercentiles = parseData(htmlContent, RESPONSES_PERCENTILES_REGEXP);

  const metricName = scalabilitySetup.responseTimeMetric || DEFAULT_METRIC;
  // warmup phase duration in seconds
  const warmupDuration = scalabilitySetup.warmup
    .map((action) => {
      const parsedValue = parseInt(action.duration.replace(/s|m/, ''), 10);
      return action.duration.endsWith('m') ? parsedValue * 60 : parsedValue;
    })
    .reduce((a, b) => a + b, 0);

  const warmupData = mapValuesWithMetrics(
    responsePercentiles.slice(0, warmupDuration),
    RESPONSE_METRICS_NAMES
  );
  const testData = mapValuesWithMetrics(
    responsePercentiles.slice(warmupDuration, responsePercentiles.length - 1),
    RESPONSE_METRICS_NAMES
  );
  const rpsData = requests.map((r) => {
    return { timestamp: r.timestamp, value: r.values.length > 0 ? r.values[0] : 0 };
  });

  const rpsMax = Math.max(...rpsData.map((i) => i.value));

  const warmupAvgResponseTime = Math.round(
    warmupData
      .map((i) => i.metrics[metricName])
      .reduce((avg, value, _, { length }) => {
        return avg + value / length;
      }, 0)
  );
  const rpsAtWarmup = Math.round(
    rpsData.slice(0, warmupDuration).reduce((avg, rps, _, { length }) => {
      return avg + rps.value / length;
    }, 0)
  );
  log.info(
    `Warmup: Avg ${metricName} pct response time - ${warmupAvgResponseTime} ms, avg rps=${rpsAtWarmup}`
  );

  // Collected response time metrics: 3 pre-defined thresholds
  const thresholds = scalabilitySetup.responseTimeThreshold || DEFAULT_THRESHOLD;

  const rpsAtThreshold1 = getRPSByResponseTime(
    rpsData,
    testData,
    thresholds.threshold1,
    metricName,
    log
  );

  const rpsAtThreshold2 = getRPSByResponseTime(
    rpsData,
    testData,
    thresholds.threshold2,
    metricName,
    log
  );

  const rpsAtThreshold3 = getRPSByResponseTime(
    rpsData,
    testData,
    thresholds.threshold3,
    metricName,
    log
  );

  return {
    warmupAvgResponseTime,
    rpsAtWarmup,
    warmupDuration,
    rpsMax,
    responseTimeMetric: metricName,
    threshold1ResponseTime: thresholds.threshold1,
    rpsAtThreshold1,
    threshold2ResponseTime: thresholds.threshold2,
    rpsAtThreshold2,
    threshold3ResponseTime: thresholds.threshold3,
    rpsAtThreshold3,
  };
}
