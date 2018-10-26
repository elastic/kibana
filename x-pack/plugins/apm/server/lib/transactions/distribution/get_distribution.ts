/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { Setup } from '../../helpers/setup_request';
import { calculateBucketSize } from './calculate_bucket_size';
import { getBuckets, IBucket } from './get_buckets';

export interface IDistributionResponse {
  totalHits: number;
  buckets: IBucket[];
  bucketSize: number;
  defaultSample?: IBucket['sample'];
}

function getDefaultSample(buckets: IBucket[]) {
  const samples = buckets
    .filter(bucket => bucket.count > 0 && bucket.sample)
    .map(bucket => bucket.sample);

  if (isEmpty(samples)) {
    return;
  }

  const middleIndex = Math.floor(samples.length / 2);
  return samples[middleIndex];
}

export async function getDistribution(
  serviceName: string,
  transactionName: string,
  setup: Setup
): Promise<IDistributionResponse> {
  const bucketSize = await calculateBucketSize(
    serviceName,
    transactionName,
    setup
  );
  const { buckets, totalHits } = await getBuckets(
    serviceName,
    transactionName,
    bucketSize,
    setup
  );

  return {
    totalHits,
    buckets,
    bucketSize,
    defaultSample: getDefaultSample(buckets)
  };
}
