/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Bucket, BucketSize } from '../types';
import { getBucketSize } from '../../../../../utils/get_bucket_size';

export function calculateBucketSize({ start, end }: Bucket): BucketSize {
  if (start && end) {
    return getBucketSize({ start, end, minInterval: '60s' });
  }
}
