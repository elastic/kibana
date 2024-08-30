/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { calculateAuto } from './calculate_auto';

export function getBucketSize({
  start,
  end,
  numBuckets = 50,
  minBucketSize,
}: {
  start: number;
  end: number;
  numBuckets?: number;
  minBucketSize?: number;
}) {
  const duration = moment.duration(end - start, 'ms');
  const bucketSize = Math.max(
    calculateAuto.near(numBuckets, duration)?.asSeconds() ?? 0,
    minBucketSize || 1
  );

  return { bucketSize, intervalString: `${bucketSize}s` };
}
