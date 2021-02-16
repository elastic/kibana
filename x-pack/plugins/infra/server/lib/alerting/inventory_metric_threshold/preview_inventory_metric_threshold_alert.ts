/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unit } from '@elastic/datemath';
import { first } from 'lodash';
import { PreviewResult } from '../common/types';
import { InventoryMetricConditions } from './types';
import {
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
  isTooManyBucketsPreviewException,
} from '../../../../common/alerting/metrics';
import { ILegacyScopedClusterClient } from '../../../../../../../src/core/server';
import { InfraSource } from '../../../../common/http_api/source_api';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { InventoryItemType } from '../../../../common/inventory_models/types';
import { evaluateCondition } from './evaluate_condition';

interface InventoryMetricThresholdParams {
  criteria: InventoryMetricConditions[];
  filterQuery: string | undefined;
  nodeType: InventoryItemType;
  sourceId?: string;
}

interface PreviewInventoryMetricThresholdAlertParams {
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
  params: InventoryMetricThresholdParams;
  source: InfraSource;
  lookback: Unit;
  alertInterval: string;
  alertThrottle: string;
  alertOnNoData: boolean;
  alertNotifyWhen: string;
}

export const previewInventoryMetricThresholdAlert: (
  params: PreviewInventoryMetricThresholdAlertParams
) => Promise<PreviewResult[]> = async ({
  callCluster,
  params,
  source,
  lookback,
  alertInterval,
  alertThrottle,
  alertOnNoData,
  alertNotifyWhen,
}: PreviewInventoryMetricThresholdAlertParams) => {
  const { criteria, filterQuery, nodeType } = params as InventoryMetricThresholdParams;

  if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

  const { timeSize, timeUnit } = criteria[0];
  const bucketInterval = `${timeSize}${timeUnit}`;
  const bucketIntervalInSeconds = getIntervalInSeconds(bucketInterval);

  const lookbackInterval = `1${lookback}`;
  const lookbackIntervalInSeconds = getIntervalInSeconds(lookbackInterval);
  const lookbackSize = Math.ceil(lookbackIntervalInSeconds / bucketIntervalInSeconds);

  const alertIntervalInSeconds = getIntervalInSeconds(alertInterval);
  const alertResultsPerExecution = alertIntervalInSeconds / bucketIntervalInSeconds;
  const throttleIntervalInSeconds = getIntervalInSeconds(alertThrottle);

  try {
    const results = await Promise.all(
      criteria.map((c) =>
        evaluateCondition(c, nodeType, source, callCluster, filterQuery, lookbackSize)
      )
    );

    const inventoryItems = Object.keys(first(results)!);
    const previewResults = inventoryItems.map((item) => {
      const numberOfResultBuckets = lookbackSize;
      const numberOfExecutionBuckets = Math.floor(numberOfResultBuckets / alertResultsPerExecution);
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
        } else if (alertNotifyWhen === 'onThrottleInterval') {
          if (throttleTracker === 0) numberOfNotifications++;
          throttleTracker += alertIntervalInSeconds;
        } else {
          numberOfNotifications++;
        }
        previousActionGroup = actionGroup;
      };
      for (let i = 0; i < numberOfExecutionBuckets; i++) {
        const mappedBucketIndex = Math.floor(i * alertResultsPerExecution);
        const allConditionsFiredInMappedBucket = results.every((result) => {
          const shouldFire = result[item].shouldFire as boolean[];
          return shouldFire[mappedBucketIndex];
        });
        const allConditionsWarnInMappedBucket =
          !allConditionsFiredInMappedBucket &&
          results.every((result) => result[item].shouldWarn[mappedBucketIndex]);
        const someConditionsNoDataInMappedBucket = results.some((result) => {
          const hasNoData = result[item].isNoData as boolean[];
          return hasNoData[mappedBucketIndex];
        });
        const someConditionsErrorInMappedBucket = results.some((result) => {
          return result[item].isError;
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
    });

    return previewResults;
  } catch (e) {
    if (!isTooManyBucketsPreviewException(e)) throw e;
    const { maxBuckets } = e;
    throw new Error(`${TOO_MANY_BUCKETS_PREVIEW_EXCEPTION}:${maxBuckets}`);
  }
};
