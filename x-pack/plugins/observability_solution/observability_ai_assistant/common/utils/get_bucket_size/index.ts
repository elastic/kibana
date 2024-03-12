/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
// @ts-ignore
import { calculateAuto } from './calculate_auto';
import { unitToSeconds } from './unit_to_seconds';

export function getBucketSize({
  start,
  end,
  minInterval,
  buckets = 100,
}: {
  start: number;
  end: number;
  minInterval: string;
  buckets?: number;
}) {
  const duration = moment.duration(end - start, 'ms');
  const bucketSize = Math.max(calculateAuto.near(buckets, duration)?.asSeconds() ?? 0, 1);
  const intervalString = `${bucketSize}s`;
  const matches = minInterval && minInterval.match(/^([\d]+)([shmdwMy]|ms)$/);
  const minBucketSize = matches ? Number(matches[1]) * unitToSeconds(matches[2]) : 0;

  if (bucketSize < minBucketSize) {
    return {
      bucketSize: minBucketSize,
      intervalString: minInterval,
    };
  }

  return { bucketSize, intervalString };
}
