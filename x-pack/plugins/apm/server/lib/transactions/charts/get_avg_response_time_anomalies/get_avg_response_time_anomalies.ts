/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup } from '../../../helpers/setup_request';
import { getAnomalyAggs } from './get_anomaly_aggs';
import { getBucketWithInitialAnomalyBounds } from './get_buckets_with_initial_anomaly_bounds';

interface Props {
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  setup: Setup;
}

export async function getAvgResponseTimeAnomalies({
  serviceName,
  transactionType,
  transactionName,
  setup
}: Props) {
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

  const anomalyBucketSpan = aggs.bucketSpan;
  const mainBuckets = aggs.avgResponseTimes.slice(1, -1);
  const bucketsWithInitialAnomalyBounds = await getBucketWithInitialAnomalyBounds(
    {
      serviceName,
      transactionType,
      start,
      client,
      mainBuckets,
      anomalyBucketSpan
    }
  );

  const buckets = bucketsWithInitialAnomalyBounds.map(bucket => {
    return {
      anomalyScore: bucket.anomaly_score.value,
      lower: bucket.lower.value,
      upper: bucket.upper.value
    };
  });

  return {
    bucketSpanAsMillis: Math.max(bucketSize, anomalyBucketSpan) * 1000,
    buckets
  };
}
