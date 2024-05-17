/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenedBucket, RawBucket } from '../../types';
import { flattenBucket } from './flatten_bucket';

export const getFlattenedBuckets = ({
  buckets,
  maxRiskSubAggregations,
  stackByField0,
}: {
  buckets: RawBucket[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
}): FlattenedBucket[] =>
  buckets.flatMap((bucket) => flattenBucket({ bucket, maxRiskSubAggregations }));
