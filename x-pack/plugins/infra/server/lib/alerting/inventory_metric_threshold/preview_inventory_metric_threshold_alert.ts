/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';
import { first } from 'lodash';
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
  config: InfraSource['configuration'];
  lookback: Unit;
  alertInterval: string;
}

export const previewInventoryMetricThresholdAlert = async ({
  callCluster,
  params,
  config,
  lookback,
  alertInterval,
}: PreviewInventoryMetricThresholdAlertParams) => {
  const { criteria, filterQuery, nodeType } = params as InventoryMetricThresholdParams;

  const { timeSize, timeUnit } = criteria[0];
  const bucketInterval = `${timeSize}${timeUnit}`;
  const bucketIntervalInSeconds = getIntervalInSeconds(bucketInterval);

  const lookbackInterval = `1${lookback}`;
  const lookbackIntervalInSeconds = getIntervalInSeconds(lookbackInterval);
  const lookbackSize = Math.ceil(lookbackIntervalInSeconds / bucketIntervalInSeconds);

  const alertIntervalInSeconds = getIntervalInSeconds(alertInterval);
  const alertResultsPerExecution = alertIntervalInSeconds / bucketIntervalInSeconds;
  try {
    const results = await Promise.all(
      criteria.map((c) =>
        evaluateCondition(c, nodeType, config, callCluster, filterQuery, lookbackSize)
      )
    );

    const inventoryItems = Object.keys(first(results) as any);
    const previewResults = inventoryItems.map((item) => {
      const isNoData = results.some((result) => result[item].isNoData);
      if (isNoData) {
        return null;
      }
      const isError = results.some((result) => result[item].isError);
      if (isError) {
        return undefined;
      }

      const numberOfResultBuckets = lookbackSize;
      const numberOfExecutionBuckets = Math.floor(numberOfResultBuckets / alertResultsPerExecution);
      return [...Array(numberOfExecutionBuckets)].reduce(
        (totalFired, _, i) =>
          totalFired +
          (results.every((result) => {
            const shouldFire = result[item].shouldFire as boolean[];
            return shouldFire[Math.floor(i * alertResultsPerExecution)];
          })
            ? 1
            : 0),
        0
      );
    });

    return previewResults;
  } catch (e) {
    if (!isTooManyBucketsPreviewException(e)) throw e;
    const { maxBuckets } = e;
    throw new Error(`${TOO_MANY_BUCKETS_PREVIEW_EXCEPTION}:${maxBuckets}`);
  }
};
