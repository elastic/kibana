/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { getAnomalyAggs } from './get_anomaly_aggs';
import { getBucketWithInitialAnomalyBounds } from './get_buckets_with_initial_anomaly_bounds';

export async function getAvgResponseTimeAnomalies({
  serviceName,
  transactionType,
  transactionName,
  setup
}) {
  const { start, end, client } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return [];
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
    return {
      message: 'ml index does not exist'
    };
  }

  const anomalyBucketSpan = get(
    aggs,
    'top_hits.hits.hits[0]._source.bucket_span'
  );

  const mainBuckets = get(aggs, 'ml_avg_response_times.buckets', []).slice(
    1,
    -1
  );

  const bucketsWithInitialAnomalyBounds = await getBucketWithInitialAnomalyBounds(
    {
      serviceName,
      transactionType,
      client,
      start,
      mainBuckets,
      anomalyBucketSpan
    }
  );

  const buckets = bucketsWithInitialAnomalyBounds.map(bucket => {
    return {
      anomaly_score: bucket.anomaly_score.value,
      lower: bucket.lower.value,
      upper: bucket.upper.value
    };
  });

  return {
    bucketSpanAsMillis: Math.max(bucketSize, anomalyBucketSpan) * 1000,
    buckets
  };
}
