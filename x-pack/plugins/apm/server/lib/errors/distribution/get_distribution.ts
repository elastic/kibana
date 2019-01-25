/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import { getBuckets } from './get_buckets';

function getBucketSize({ start, end, config }: Setup) {
  const bucketTargetCount = config.get<number>('xpack.apm.bucketTargetCount');
  return Math.floor((end - start) / bucketTargetCount);
}

export interface ErrorDistributionAPIResponse {
  totalHits: number;
  buckets: Array<{
    key: number;
    count: number;
  }>;
  bucketSize: number;
}

export async function getDistribution({
  serviceName,
  groupId,
  setup
}: {
  serviceName: string;
  groupId?: string;
  setup: Setup;
}): Promise<ErrorDistributionAPIResponse> {
  const bucketSize = getBucketSize(setup);
  const { buckets, totalHits } = await getBuckets({
    serviceName,
    groupId,
    bucketSize,
    setup
  });

  return {
    totalHits,
    buckets,
    bucketSize
  };
}
