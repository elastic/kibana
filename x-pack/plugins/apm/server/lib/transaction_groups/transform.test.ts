/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from './fetcher';
import { transactionGroupsResponse } from './mock_responses/transaction_groups_response';
import { transactionGroupsTransformer } from './transform';

describe('transactionGroupsTransformer', () => {
  it('should match snapshot', () => {
    const {
      bucketSize,
      isAggregationAccurate,
      items,
    } = transactionGroupsTransformer({
      response: transactionGroupsResponse,
      start: 100,
      end: 2000,
      bucketSize: 100,
    });

    expect(bucketSize).toBe(100);
    expect(isAggregationAccurate).toBe(true);
    expect(items).toMatchSnapshot();
  });

  it('should transform response correctly', () => {
    const bucket = {
      key: { transaction: 'POST /api/orders' },
      doc_count: 180,
      avg: { value: 255966.30555555556 },
      p95: { values: { '95.0': 320238.5 } },
      sum: { value: 3000000000 },
      sample: {
        hits: {
          total: 180,
          hits: [{ _source: 'sample source' }],
        },
      },
    };

    const response = ({
      aggregations: {
        transaction_groups: {
          buckets: [bucket],
        },
      },
    } as unknown) as ESResponse;

    expect(
      transactionGroupsTransformer({
        response,
        start: 100,
        end: 20000,
        bucketSize: 100,
      })
    ).toEqual({
      bucketSize: 100,
      isAggregationAccurate: true,
      items: [
        {
          averageResponseTime: 255966.30555555556,
          impact: 0,
          name: 'POST /api/orders',
          p95: 320238.5,
          sample: 'sample source',
          transactionsPerMinute: 542.713567839196,
        },
      ],
    });
  });

  it('`isAggregationAccurate` should be false if number of bucket is higher than `bucketSize`', () => {
    const bucket = {
      key: { transaction: 'POST /api/orders' },
      doc_count: 180,
      avg: { value: 255966.30555555556 },
      p95: { values: { '95.0': 320238.5 } },
      sum: { value: 3000000000 },
      sample: {
        hits: {
          total: 180,
          hits: [{ _source: 'sample source' }],
        },
      },
    };

    const response = ({
      aggregations: {
        transaction_groups: {
          buckets: [bucket, bucket, bucket, bucket], // four buckets returned
        },
      },
    } as unknown) as ESResponse;

    const { isAggregationAccurate } = transactionGroupsTransformer({
      response,
      start: 100,
      end: 20000,
      bucketSize: 3, // bucket size of three
    });

    expect(isAggregationAccurate).toEqual(false);
  });

  it('should calculate impact from sum', () => {
    const getBucket = (sum: number) => ({
      key: { transaction: 'POST /api/orders' },
      doc_count: 180,
      avg: { value: 300000 },
      p95: { values: { '95.0': 320000 } },
      sum: { value: sum },
      sample: { hits: { total: 180, hits: [{ _source: 'sample source' }] } },
    });

    const response = ({
      aggregations: {
        transaction_groups: {
          buckets: [getBucket(10), getBucket(20), getBucket(50)],
        },
      },
    } as unknown) as ESResponse;

    const { items } = transactionGroupsTransformer({
      response,
      start: 100,
      end: 20000,
      bucketSize: 100,
    });

    expect(items.map((bucket) => bucket.impact)).toEqual([100, 25, 0]);
  });
});
