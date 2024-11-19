/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeBuckets } from '@kbn/data-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { getAbsoluteTime } from '../../../utils/date';
import { getBucketSize } from '../../../utils/get_bucket_size';
import { DEFAULT_INTERVAL } from '../../../constants';

export type BucketSize =
  | { bucketSize: number; intervalString: string; dateFormat: string }
  | undefined;

interface Bucket {
  start?: number;
  end?: number;
  timeBuckets: TimeBuckets;
}

export function calculateBucketSize({ start, end, timeBuckets }: Bucket): BucketSize {
  if (start && end) {
    const { bucketSize, intervalString } = getBucketSize({
      start,
      end,
      minInterval: DEFAULT_INTERVAL,
    });
    timeBuckets.setInterval(intervalString);

    return {
      bucketSize,
      intervalString,
      dateFormat: timeBuckets.getScaledDateFormat(),
    };
  }
}

export function calculateTimeRangeBucketSize(
  { from, to }: TimeRange,
  timeBuckets: TimeBuckets
): BucketSize {
  const start = getAbsoluteTime(from);
  const end = getAbsoluteTime(to, { roundUp: true });

  return calculateBucketSize({ start, end, timeBuckets });
}
