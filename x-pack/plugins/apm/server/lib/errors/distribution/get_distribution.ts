/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { BUCKET_TARGET_COUNT } from '../../transactions/constants';
import { getBuckets } from './get_buckets';

function getBucketSize({ start, end }: SetupTimeRange) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
}

export async function getErrorDistribution({
  environment,
  serviceName,
  groupId,
  setup,
}: {
  environment?: string;
  serviceName: string;
  groupId?: string;
  setup: Setup & SetupTimeRange;
}) {
  const bucketSize = getBucketSize({ start: setup.start, end: setup.end });
  const { buckets, noHits } = await getBuckets({
    environment,
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
