/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
// @ts-expect-error
import { calculateAuto } from './calculate_auto';

export function getDateBucketOptions(
  start: number,
  end: number,
  numBuckets: number = 100
) {
  const duration = moment.duration(end - start, 'ms');
  const bucketSize = Math.max(
    calculateAuto.near(numBuckets, duration).asSeconds(),
    1
  );
  const intervalString = `${bucketSize}s`;

  if (bucketSize <= 0) {
    throw new Error(`Could not calculate bucket size`);
  }

  return {
    bucketSizeInSeconds: bucketSize,
    unit: bucketSize < 60 ? ('second' as const) : ('minute' as const),
    intervalString,
  };
}

export type DateBucketOptions = ReturnType<typeof getDateBucketOptions>;
export type DateBucketUnit = DateBucketOptions['unit'];
