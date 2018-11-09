/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import { ESClient } from '../../../helpers/setup_request';
import { AvgResponseTimeBucket, getAnomalyAggs } from './get_anomaly_aggs';

interface Props {
  serviceName: string;
  transactionType: string;
  mainBuckets: AvgResponseTimeBucket[];
  anomalyBucketSpan: number;
  start: number;
  client: ESClient<any>;
}

export async function getBucketWithInitialAnomalyBounds({
  serviceName,
  transactionType,
  mainBuckets,
  anomalyBucketSpan,
  start,
  client
}: Props) {
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

  // TODO: this should be possible and should be handled better
  if (!aggs) {
    return [];
  }

  const firstBucketWithBounds = last(
    aggs.avgResponseTimes.filter(bucket => bucket.lower.value)
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
