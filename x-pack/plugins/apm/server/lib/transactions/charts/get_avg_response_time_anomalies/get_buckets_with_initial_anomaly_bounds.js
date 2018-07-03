/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last, get } from 'lodash';
import { getAnomalyAggs } from './get_anomaly_aggs';

export async function getBucketWithInitialAnomalyBounds({
  serviceName,
  transactionType,
  client,
  start,
  mainBuckets,
  anomalyBucketSpan
}) {
  // abort if first bucket already has values for initial anomaly bounds
  if (mainBuckets[0].lower.value || !anomalyBucketSpan) {
    return mainBuckets;
  }

  const newStart = start - anomalyBucketSpan * 1000;
  const newEnd = start;

  const aggs = await getAnomalyAggs({
    serviceName,
    transactionType,
    intervalString: `${anomalyBucketSpan}s`,
    client,
    start: newStart,
    end: newEnd
  });

  const firstBucketWithBounds = last(
    get(aggs, 'ml_avg_response_times.buckets', []).filter(
      bucket => bucket.lower.value
    )
  );

  return mainBuckets.map((bucket, i) => {
    // replace first item
    if (i === 0 && firstBucketWithBounds) {
      return {
        ...bucket,
        upper: { value: firstBucketWithBounds.upper.value },
        lower: { value: firstBucketWithBounds.lower.value }
      };
    }
    return bucket;
  });
}
