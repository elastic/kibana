/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from './fetcher';
import { transactionGroupsResponse } from './mock-responses/transactionGroupsResponse';
import { transactionGroupsTransformer } from './transform';

describe('transactionGroupsTransformer', () => {
  it('should match snapshot', () => {
    expect(
      transactionGroupsTransformer({
        response: transactionGroupsResponse,
        start: 100,
        end: 2000
      })
    ).toMatchSnapshot();
  });

  fit('should transform response correctly', () => {
    const bucket = {
      key: 'POST /api/orders',
      doc_count: 180,
      avg: { value: 255966.30555555556 },
      p95: { values: { '95.0': 320238.5 } },
      sample: {
        hits: {
          total: 180,
          hits: [{ _source: 'sample source' }]
        }
      }
    };

    const response = ({
      aggregations: {
        transactions: {
          buckets: [bucket]
        }
      }
    } as unknown) as ESResponse;

    expect(
      transactionGroupsTransformer({ response, start: 100, end: 20000 })
    ).toEqual([
      {
        averageResponseTime: 255966.30555555556,
        impact: 0,
        name: 'POST /api/orders',
        p95: 320238.5,
        sample: 'sample source',
        transactionsPerMinute: 542.713567839196
      }
    ]);
  });
});
