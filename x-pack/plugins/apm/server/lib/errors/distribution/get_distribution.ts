/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../../../observability/typings/common';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { BUCKET_TARGET_COUNT } from '../../transactions/constants';
import { getBuckets } from './get_buckets';

function getBucketSize({ start, end }: SetupTimeRange) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
}

export type ErrorDistributionAPIResponse = PromiseReturnType<
  typeof getErrorDistribution
>;

export async function getErrorDistribution({
  serviceName,
  groupId,
  setup,
}: {
  serviceName: string;
  groupId?: string;
  setup: Setup & SetupTimeRange;
}) {
  const bucketSize = getBucketSize({ start: setup.start, end: setup.end });
  const { buckets, noHits } = await getBuckets({
    serviceName,
    groupId,
    bucketSize,
    setup,
  });

  return {
    noHits,
    buckets,
    bucketSize,
  };
}
