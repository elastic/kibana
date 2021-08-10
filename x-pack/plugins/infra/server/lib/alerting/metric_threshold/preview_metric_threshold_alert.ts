/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, zip } from 'lodash';
import { Unit } from '@elastic/datemath';
import {
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
  isTooManyBucketsPreviewException,
} from '../../../../common/alerting/metrics';
import { ElasticsearchClient } from '../../../../../../../src/core/server';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { PreviewResult } from '../common/types';
import { MetricExpressionParams } from './types';
import { evaluateAlert } from './lib/evaluate_alert';

const MAX_ITERATIONS = 50;

interface PreviewMetricThresholdAlertParams {
  esClient: ElasticsearchClient;
  params: {
    criteria: MetricExpressionParams[];
    groupBy: string | undefined | string[];
    filterQuery: string | undefined;
    shouldDropPartialBuckets?: boolean;
  };
  config: InfraSource['configuration'];
  lookback: Unit;
  alertInterval: string;
  alertThrottle: string;
  alertNotifyWhen: string;
  alertOnNoData: boolean;
  end?: number;
  overrideLookbackIntervalInSeconds?: number;
}

export const previewMetricThresholdAlert: (
  params: PreviewMetricThresholdAlertParams,
  iterations?: number,
  precalculatedNumberOfGroups?: number
) => Promise<PreviewResult[]> = async (
  {
    esClient,
    params,
    config,
    lookback,
    alertInterval,
    alertThrottle,
    alertNotifyWhen,
    alertOnNoData,
    end = Date.now(),
    overrideLookbackIntervalInSeconds,
  },
  iterations = 0,
  precalculatedNumberOfGroups
) => {
  if (params.criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

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
  const lookbackIntervalInSeconds =
    overrideLookbackIntervalInSeconds ?? getIntervalInSeconds(lookbackInterval);

  const start = end - lookbackIntervalInSeconds * 1000;
  const timeframe = { start, end };

  // Get a date histogram using the bucket interval and the lookback interval
  try {
    const alertResults = await evaluateAlert(esClient, params, config, timeframe);
    const groups = Object.keys(first(alertResults)!);

    // Now determine how to interpolate this histogram based on the alert interval
    const alertIntervalInSeconds = getIntervalInSeconds(alertInterval);
    const alertResultsPerExecution = alertIntervalInSeconds / bucketIntervalInSeconds;
    const throttleIntervalInSeconds = Math.max(
      getIntervalInSeconds(alertThrottle),
      alertIntervalInSeconds
    );

    const previewResults = await Promise.all(
      groups.map(async (group) => {
        // Interpolate the buckets returned by evaluateAlert and return a count of how many of these
        // buckets would have fired the alert. If the alert interval and bucket interval are the same,
        // this will be a 1:1 evaluation of the alert results. If these are different, the interpolation
        // will skip some buckets or read some buckets more than once, depending on the differential
        const numberOfResultBuckets = first(alertResults)![group].shouldFire.length;
        const numberOfExecutionBuckets = Math.floor(
          numberOfResultBuckets / alertResultsPerExecution
        );
        let numberOfTimesFired = 0;
        let numberOfTimesWarned = 0;
        let numberOfNoDataResults = 0;
        let numberOfErrors = 0;
        let numberOfNotifications = 0;
        let throttleTracker = 0;
        let previousActionGroup: string | null = null;
        const notifyWithThrottle = (actionGroup: string) => {
          if (alertNotifyWhen === 'onActionGroupChange') {
            if (previousActionGroup !== actionGroup) numberOfNotifications++;
            previousActionGroup = actionGroup;
          } else if (alertNotifyWhen === 'onThrottleInterval') {
            if (throttleTracker === 0) numberOfNotifications++;
            throttleTracker += alertIntervalInSeconds;
          } else {
            numberOfNotifications++;
          }
        };
        for (let i = 0; i < numberOfExecutionBuckets; i++) {
          const mappedBucketIndex = Math.floor(i * alertResultsPerExecution);
          const allConditionsFiredInMappedBucket = alertResults.every(
            (alertResult) => alertResult[group].shouldFire[mappedBucketIndex]
          );
          const allConditionsWarnInMappedBucket =
            !allConditionsFiredInMappedBucket &&
            alertResults.every((alertResult) => alertResult[group].shouldWarn[mappedBucketIndex]);
          const someConditionsNoDataInMappedBucket = alertResults.some((alertResult) => {
            const hasNoData = alertResult[group].isNoData as boolean[];
            return hasNoData[mappedBucketIndex];
          });
          const someConditionsErrorInMappedBucket = alertResults.some((alertResult) => {
            return alertResult[group].isError;
          });
          if (someConditionsErrorInMappedBucket) {
            numberOfErrors++;
            if (alertOnNoData) {
              notifyWithThrottle('fired'); // TODO: Update this when No Data alerts move to an action group
            }
          } else if (someConditionsNoDataInMappedBucket) {
            numberOfNoDataResults++;
            if (alertOnNoData) {
              notifyWithThrottle('fired'); // TODO: Update this when No Data alerts move to an action group
            }
          } else if (allConditionsFiredInMappedBucket) {
            numberOfTimesFired++;
            notifyWithThrottle('fired');
          } else if (allConditionsWarnInMappedBucket) {
            numberOfTimesWarned++;
            notifyWithThrottle('warning');
          } else {
            previousActionGroup = 'recovered';
            if (throttleTracker > 0) {
              throttleTracker += alertIntervalInSeconds;
            }
          }
          if (throttleTracker >= throttleIntervalInSeconds) {
            throttleTracker = 0;
          }
        }
        return {
          fired: numberOfTimesFired,
          warning: numberOfTimesWarned,
          noData: numberOfNoDataResults,
          error: numberOfErrors,
          notifications: numberOfNotifications,
        };
      })
    );
    return previewResults;
  } catch (e) {
    if (isTooManyBucketsPreviewException(e)) {
      // If there's too much data on the first request, recursively slice the lookback interval
      // until all the data can be retrieved
      const basePreviewParams = {
        esClient,
        params,
        config,
        lookback,
        alertInterval,
        alertThrottle,
        alertOnNoData,
        alertNotifyWhen,
      };
      const { maxBuckets } = e;
      // If this is still the first iteration, try to get the number of groups in order to
      // calculate max buckets. If this fails, just estimate based on 1 group
      const currentAlertResults = !precalculatedNumberOfGroups
        ? await evaluateAlert(esClient, params, config)
        : [];
      const numberOfGroups =
        precalculatedNumberOfGroups ?? Math.max(Object.keys(first(currentAlertResults)!).length, 1);
      const estimatedTotalBuckets =
        (lookbackIntervalInSeconds / bucketIntervalInSeconds) * numberOfGroups;
      // The minimum number of slices is 2. In case we underestimate the total number of buckets
      // in the first iteration, we can bisect the remaining buckets on further recursions to get
      // all the data needed
      const slices = Math.max(Math.ceil(estimatedTotalBuckets / maxBuckets), 2);
      const slicedLookback = Math.floor(lookbackIntervalInSeconds / slices);

      // Bail out if it looks like this is going to take too long
      if (slicedLookback <= 0 || iterations > MAX_ITERATIONS || slices > MAX_ITERATIONS) {
        throw new Error(`${TOO_MANY_BUCKETS_PREVIEW_EXCEPTION}:${maxBuckets * MAX_ITERATIONS}`);
      }

      const slicedRequests = [...Array(slices)].map((_, i) => {
        return previewMetricThresholdAlert(
          {
            ...basePreviewParams,
            end: Math.min(end, start + slicedLookback * (i + 1) * 1000),
            overrideLookbackIntervalInSeconds: slicedLookback,
          },
          iterations + slices,
          numberOfGroups
        );
      });
      const results = await Promise.all(slicedRequests);
      const zippedResult = zip(...results).map((result) =>
        result
          // `undefined` values occur if there is no data at all in a certain slice, and that slice
          // returns an empty array. This is different from an error or no data state,
          // so filter these results out entirely and only regard the resultA portion
          .filter(
            <Value>(value: Value): value is NonNullable<Value> => typeof value !== 'undefined'
          )
          .reduce((a, b) => {
            if (!a) return b;
            if (!b) return a;
            const res = { ...a };
            const entries = (Object.entries(b) as unknown) as Array<[keyof PreviewResult, number]>;
            for (const [key, value] of entries) {
              res[key] += value;
            }
            return res;
          })
      );
      return zippedResult;
    } else throw e;
  }
};
