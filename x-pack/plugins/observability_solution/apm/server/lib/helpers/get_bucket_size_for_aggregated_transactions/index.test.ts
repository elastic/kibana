/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getBucketSizeForAggregatedTransactions } from '.';

describe('getBucketSizeForAggregatedTransactions', () => {
  describe('when searchAggregatedTransactions is enabled', () => {
    it('returns min bucket size when date difference is lower than 60s', () => {
      expect(
        getBucketSizeForAggregatedTransactions({
          start: new Date('2021-06-30T15:00:00.000Z').valueOf(),
          end: new Date('2021-06-30T15:00:30.000Z').valueOf(),
          numBuckets: 10,
          searchAggregatedTransactions: true,
        })
      ).toEqual({ bucketSize: 60, intervalString: '60s' });
    });
    it('returns bucket size when date difference is greater than 60s', () => {
      expect(
        getBucketSizeForAggregatedTransactions({
          start: new Date('2021-06-30T15:00:00.000Z').valueOf(),
          end: new Date('2021-06-30T15:30:00.000Z').valueOf(),
          numBuckets: 10,
          searchAggregatedTransactions: true,
        })
      ).toEqual({ bucketSize: 300, intervalString: '300s' });
    });
  });
  describe('when searchAggregatedTransactions is disabled', () => {
    it('returns 1s as bucket size', () => {
      expect(
        getBucketSizeForAggregatedTransactions({
          start: new Date('2021-06-30T15:00:00.000Z').valueOf(),
          end: new Date('2021-06-30T15:00:30.000Z').valueOf(),
          numBuckets: 10,
          searchAggregatedTransactions: false,
        })
      ).toEqual({ bucketSize: 1, intervalString: '1s' });
    });
  });
});
