/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../helpers/setup_request';
import { BUCKET_TARGET_COUNT } from '../../transactions/constants';
import { getBuckets } from './get_buckets';

function getBucketSize({ start, end }: { start: number; end: number }) {
  return Math.floor((end - start) / BUCKET_TARGET_COUNT);
}

export async function getErrorDistribution({
  environment,
  kuery,
  serviceName,
  groupId,
  setup,
  start,
  end,
  comparisonStart,
  comparisonEnd,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  groupId?: string;
  setup: Setup;
  start: number;
  end: number;
  comparisonStart: number;
  comparisonEnd: number;
}) {
  const bucketSize = getBucketSize({ start, end });
  const commonProps = {
    environment,
    kuery,
    serviceName,
    groupId,
    setup,
    bucketSize,
  };
  const currentPeriodPromise = await getBuckets({
    ...commonProps,
    start,
    end,
  });
  const previousPeriodPromise = await getBuckets({
    ...commonProps,
    start: comparisonStart,
    end: comparisonEnd,
  });

  return {
    noHits: [currentPeriodPromise.noHits, previousPeriodPromise.noHits],
    currentPeriod: currentPeriodPromise.buckets,
    previousPeriod: previousPeriodPromise.buckets,
    bucketSize,
  };
}
