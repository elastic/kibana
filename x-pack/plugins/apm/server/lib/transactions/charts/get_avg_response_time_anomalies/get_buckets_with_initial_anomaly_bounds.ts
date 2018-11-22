/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import { ESClient } from '../../../helpers/setup_request';
import { getAnomalyAggs } from './get_anomaly_aggs';
import { AvgAnomalyBucket } from './get_anomaly_aggs/transform';

interface Props {
  serviceName: string;
  transactionType: string;
  buckets: AvgAnomalyBucket[];
  bucketSize: number;
  start: number;
  client: ESClient;
}

export async function getBucketWithInitialAnomalyBounds({
  serviceName,
  transactionType,
  buckets,
  bucketSize,
  start,
  client
}: Props) {
  // abort if first bucket already has values for initial anomaly bounds
  if (buckets[0].lower || !bucketSize) {
    return buckets;
  }

  const newStart = start - bucketSize * 1000;
  const newEnd = start;

  const aggs = await getAnomalyAggs({
    serviceName,
    transactionType,
    intervalString: `${bucketSize}s`,
    client,
    start: newStart,
    end: newEnd
  });

  if (!aggs) {
    return buckets;
  }

  const firstBucketWithBounds = last(
    aggs.buckets.filter(bucket => bucket.lower)
  );

  if (!firstBucketWithBounds) {
    return buckets;
  }

  return replaceFirstItem(buckets, firstBucketWithBounds);
}

// copy array and replace first item
function replaceFirstItem<T>(array: T[], value: T) {
  const ret = array.slice(0);
  ret[0] = value;
  return ret;
}
