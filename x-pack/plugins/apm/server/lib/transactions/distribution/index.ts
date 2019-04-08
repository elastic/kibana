/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import { calculateBucketSize } from './calculate_bucket_size';
import { getBuckets } from './get_buckets';
import { IBucket } from './get_buckets/transform';

export interface ITransactionDistributionAPIResponse {
  totalHits: number;
  buckets: IBucket[];
  bucketSize: number;
  defaultSample?: IBucket['sample'];
}

export async function getDistribution(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  transactionId: string,
  traceId: string,
  setup: Setup
): Promise<ITransactionDistributionAPIResponse> {
  const bucketSize = await calculateBucketSize(
    serviceName,
    transactionName,
    transactionType,
    setup
  );

  const { defaultSample, buckets, totalHits } = await getBuckets(
    serviceName,
    transactionName,
    transactionType,
    transactionId,
    traceId,
    bucketSize,
    setup
  );

  return {
    totalHits,
    buckets,
    bucketSize,
    defaultSample
  };
}
