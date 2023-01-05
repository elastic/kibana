/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBucketSize } from '../get_bucket_size';

export function getBucketSizeForAggregatedTransactions({
  start,
  end,
  numBuckets = 50,
  searchAggregatedTransactions,
  searchAggregatedServiceMetrics,
}: {
  start: number;
  end: number;
  numBuckets?: number;
  searchAggregatedTransactions?: boolean;
  searchAggregatedServiceMetrics?: boolean;
}) {
  const minBucketSize =
    searchAggregatedTransactions || searchAggregatedServiceMetrics
      ? 60
      : undefined;
  return getBucketSize({ start, end, numBuckets, minBucketSize });
}
