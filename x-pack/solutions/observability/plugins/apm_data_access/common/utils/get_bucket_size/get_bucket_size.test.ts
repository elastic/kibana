/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { getBucketSize } from '.';

const numBuckets = 8;

describe('getBucketSize', () => {
  const end = moment();
  it('returns 60 second interval for a 1 minute duration', () => {
    const start = moment(end).subtract(15, 'milliseconds');
    const minBucketSize = 60;
    expect(
      getBucketSize({
        start: start.valueOf(),
        end: end.valueOf(),
        numBuckets,
        minBucketSize,
      }).bucketSize
    ).toEqual(minBucketSize);
  });
  it('returns minBucketSize for a less than 1 second duration', () => {
    const start = moment(end).subtract(500, 'milliseconds'); // 0.5 seconds as milliseconds
    const minBucketSize = 60; // in seconds
    expect(
      getBucketSize({
        start: start.valueOf(),
        end: end.valueOf(),
        numBuckets,
        minBucketSize,
      }).bucketSize
    ).toEqual(minBucketSize);
  });
  it('returns 1 for a less than 1 second duration when minBucketSize is not provided', () => {
    const start = moment(end).subtract(500, 'milliseconds'); // 0.5 seconds as milliseconds
    expect(
      getBucketSize({
        start: start.valueOf(),
        end: end.valueOf(),
        numBuckets,
      }).bucketSize
    ).toEqual(1);
  });
});
