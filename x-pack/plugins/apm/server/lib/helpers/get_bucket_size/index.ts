/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
// @ts-expect-error
import { calculateAuto } from './calculate_auto';

export function getBucketSize({
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
  const duration = moment.duration(end - start, 'ms');
  const bucketSize = Math.max(
    calculateAuto.near(numBuckets, duration).asSeconds(),
    1
  );

  const intervalString = `${bucketSize}s`;

  if (searchAggregatedTransactions && bucketSize < 60) {
    return { bucketSize: 60, intervalString: '60s' };
  }

  if (bucketSize < 0) {
    return {
      bucketSize: 0,
      intervalString: 'auto',
    };
  }

  return { bucketSize, intervalString };
}
