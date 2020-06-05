/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'lodash';
import { TOO_MANY_BUCKETS_PREVIEW_EXCEPTION } from '../../../../common/alerting/metrics';
import { IScopedClusterClient } from '../../../../../../../src/core/server';
import { InfraSource } from '../../../../common/http_api/source_api';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { MetricExpressionParams } from './types';
import { evaluateAlert } from './lib/evaluate_alert';

interface PreviewMetricThresholdAlertParams {
  callCluster: IScopedClusterClient['callAsCurrentUser'];
  params: {
    criteria: MetricExpressionParams[];
    groupBy: string | undefined | string[];
    filterQuery: string | undefined;
  };
  config: InfraSource['configuration'];
  lookback: 'h' | 'd' | 'w' | 'M';
  alertInterval: string;
}

export const previewMetricThresholdAlert: (
  params: PreviewMetricThresholdAlertParams
) => Promise<
  Array<number | null | undefined | typeof TOO_MANY_BUCKETS_PREVIEW_EXCEPTION>
> = async ({ callCluster, params, config, lookback, alertInterval }) => {
  // There are three different "intervals" we're dealing with here, so to disambiguate:
  // - The lookback interval, which is how long of a period of time we want to examine to count
  //   how many times the alert fired
  // - The interval in the alert params, which we'll call the bucket interval; this is how large of
  //   a time bucket the alert uses to evaluate its result
  // - The alert interval, which is how often the alert fires

  const { timeSize, timeUnit } = params.criteria[0];
  const bucketInterval = `${timeSize}${timeUnit}`;
  const bucketIntervalInSeconds = getIntervalInSeconds(bucketInterval);

  const lookbackInterval = `1${lookback}`;
  const lookbackIntervalInSeconds = getIntervalInSeconds(lookbackInterval);

  const end = Date.now();
  const start = end - lookbackIntervalInSeconds * 1000;
  const timeframe = { start, end };

  // Get a date histogram using the bucket interval and the lookback interval
  const alertResults = await evaluateAlert(callCluster, params, config, timeframe);
  const groups = Object.keys(first(alertResults));

  // Now determine how to interpolate this histogram based on the alert interval
  const alertIntervalInSeconds = getIntervalInSeconds(alertInterval);
  const alertResultsPerExecution = alertIntervalInSeconds / bucketIntervalInSeconds;

  return groups.map((group) => {
    const tooManyBuckets = alertResults.some((alertResult) => alertResult[group].tooManyBuckets);
    if (tooManyBuckets) {
      return TOO_MANY_BUCKETS_PREVIEW_EXCEPTION;
    }

    const isNoData = alertResults.some((alertResult) => alertResult[group].isNoData);
    if (isNoData) {
      return null;
    }
    const isError = alertResults.some((alertResult) => alertResult[group].isError);
    if (isError) {
      return undefined;
    }

    // Interpolate the buckets returned by evaluateAlert and return an array of how many of these
    // buckets would have fired the alert. If the alert interval and bucket interval are the same,
    // this will be a 1:1 evaluation of the alert results. If these are different, the interpolation
    // will skip some buckets or read some buckets more than once, depending on the differential
    const numberOfResultBuckets = first(alertResults)[group].shouldFire.length;
    const numberOfExecutionBuckets = Math.floor(numberOfResultBuckets / alertResultsPerExecution);
    return [...Array(numberOfExecutionBuckets)].reduce(
      (totalFired, _, i) =>
        totalFired +
        (alertResults.every(
          (alertResult) => alertResult[group].shouldFire[Math.floor(i * alertResultsPerExecution)]
        )
          ? 1
          : 0),
      0
    );
  });
};
