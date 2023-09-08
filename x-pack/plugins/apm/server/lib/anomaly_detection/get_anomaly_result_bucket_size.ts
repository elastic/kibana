/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBucketSize } from '../../../common/utils/get_bucket_size';

export function getAnomalyResultBucketSize({
  start,
  end,
  minBucketSize,
}: {
  start: number;
  end: number;
  minBucketSize?: number;
}) {
  return getBucketSize({
    start,
    end,
    numBuckets: 100,
    minBucketSize,
  });
}
