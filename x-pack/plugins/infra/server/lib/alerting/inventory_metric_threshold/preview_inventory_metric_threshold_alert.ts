/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first } from 'lodash';
import { InventoryMetricConditions } from './types';
import { IScopedClusterClient } from '../../../../../../../src/core/server';
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
  callCluster: IScopedClusterClient['callAsCurrentUser'];
  params: InventoryMetricThresholdParams;
  config: InfraSource['configuration'];
  lookback: 'h' | 'd' | 'w' | 'M';
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

  const results = await Promise.all(
    criteria.map((c) =>
      evaluateCondition(c, nodeType, config, callCluster, filterQuery, lookbackSize)
    )
  );

  const inventoryItems = Object.keys(first(results));
  for (const item of inventoryItems) {
    console.log(JSON.stringify(result[item], null, 4));

    // // AND logic; all criteria must be across the threshold
    // const shouldAlertFire = results.every((result) => result[item].shouldFire);

    // // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
    // // whole alert is in a No Data/Error state
    // const isNoData = results.some((result) => result[item].isNoData);
    // const isError = results.some((result) => result[item].isError);
  }
  return true;
};
