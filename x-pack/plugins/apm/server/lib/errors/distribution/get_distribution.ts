/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { getBuckets } from './get_buckets';

function getBucketSize({ start, end, config }: Setup) {
  const bucketTargetCount = config.get<number>('xpack.apm.bucketTargetCount');
  return Math.floor((end - start) / bucketTargetCount);
}

export type ErrorDistributionAPIResponse = PromiseReturnType<
  typeof getErrorDistribution
>;

export async function getErrorDistribution({
  serviceName,
  groupId,
  setup
}: {
  serviceName: string;
  groupId?: string;
  setup: Setup;
}) {
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
