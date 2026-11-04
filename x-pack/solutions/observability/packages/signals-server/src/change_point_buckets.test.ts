/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_CHANGE_POINT_BUCKETS,
  MIN_CHANGE_POINT_BUCKETS,
  isWithinChangePointBucketRange,
} from './change_point_buckets';

describe('isWithinChangePointBucketRange', () => {
  it('accepts the inclusive bounds and rejects everything outside them', () => {
    expect(isWithinChangePointBucketRange(MIN_CHANGE_POINT_BUCKETS)).toBe(true);
    expect(isWithinChangePointBucketRange(MAX_CHANGE_POINT_BUCKETS)).toBe(true);
    expect(isWithinChangePointBucketRange(MIN_CHANGE_POINT_BUCKETS - 1)).toBe(false);
    expect(isWithinChangePointBucketRange(MAX_CHANGE_POINT_BUCKETS + 1)).toBe(false);
    expect(isWithinChangePointBucketRange(22.5)).toBe(false);
  });
});
