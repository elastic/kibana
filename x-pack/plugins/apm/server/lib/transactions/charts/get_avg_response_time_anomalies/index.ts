/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from '../../../helpers/get_bucket_size';
import { IOptions } from '../get_timeseries_data';
import { getAnomalyAggs } from './get_anomaly_aggs';
import { AvgAnomalyBucket } from './get_anomaly_aggs/transform';
import { getBucketWithInitialAnomalyBounds } from './get_buckets_with_initial_anomaly_bounds';

export interface IAvgAnomalies {
  bucketSizeAsMillis: number;
  buckets: AvgAnomalyBucket[];
}

export type IAvgAnomaliesResponse = IAvgAnomalies | undefined;

export async function getAvgResponseTimeAnomalies({
  serviceName,
  transactionType,
  transactionName,
  setup
}: IOptions): Promise<IAvgAnomaliesResponse> {
  const { start, end, client } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return;
  }

  const aggs = await getAnomalyAggs({
    serviceName,
    transactionType,
    intervalString,
    client,
    start,
    end
  });

  if (!aggs) {
    return;
  }

  const buckets = await getBucketWithInitialAnomalyBounds({
    serviceName,
    transactionType,
    buckets: aggs.buckets.slice(1, -1),
    bucketSize: aggs.bucketSize,
    start,
    client
  });

  return {
    buckets,
    bucketSizeAsMillis: Math.max(bucketSize, aggs.bucketSize) * 1000
  };
}
