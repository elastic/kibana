/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
// @ts-expect-error
import { calculateAuto } from './calculate_auto';

export function getBucketSize({
  start,
  end,
  numBuckets = 100,
}: {
  start: number;
  end: number;
  numBuckets?: number;
}) {
  const duration = moment.duration(end - start, 'ms');
  const bucketSize = Math.max(
    calculateAuto.near(numBuckets, duration).asSeconds(),
    1
  );
  const intervalString = `${bucketSize}s`;

  if (bucketSize < 0) {
    return {
      bucketSize: 0,
      intervalString: 'auto',
    };
  }

  return { bucketSize, intervalString };
}
