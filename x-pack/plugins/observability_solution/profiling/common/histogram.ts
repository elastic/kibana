/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';

export function computeBucketWidthFromTimeRangeAndBucketCount(
  timeFrom: number,
  timeTo: number,
  numBuckets: number
): number {
  return Math.max(Math.floor((timeTo - timeFrom) / numBuckets), 1);
}

// Given a possibly empty set of timestamps, a time range, and a bucket width,
// we create an increasing list of timestamps that are uniformally spaced and
// cover the given time range.
//
// The smallest timestamp, t0, should match this invariant:
//   timeFrom - bucketWidth < t0 <= timeFrom
//
// The largest timestamp, t1, should match this invariant:
//   timeTo - bucketWidth < t1 <= timeTo
export function createUniformBucketsForTimeRange(
  timestamps: number[],
  timeFrom: number,
  timeTo: number,
  bucketWidth: number
): number[] {
  if (timestamps.length > 0) {
    // We only need one arbitrary timestamp to generate the buckets covering
    // the given time range
    const t = timestamps[0];
    const left = t - bucketWidth * Math.ceil((t - timeFrom) / bucketWidth);
    const right = t + bucketWidth * Math.floor((timeTo - t) / bucketWidth);
    return range(left, right + 1, bucketWidth);
  }
  return range(timeFrom, timeTo + 1, bucketWidth);
}
