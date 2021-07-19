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
  numBuckets = 100,
  searchAggregatedTransactions,
}: {
  start: number;
  end: number;
  numBuckets?: number;
  searchAggregatedTransactions?: boolean;
}) {
  const minBucketSize = searchAggregatedTransactions ? 60 : undefined;
  return getBucketSize({ start, end, numBuckets, minBucketSize });
}
