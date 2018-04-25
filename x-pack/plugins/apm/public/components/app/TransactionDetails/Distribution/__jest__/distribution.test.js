/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFormattedBuckets } from '../view';

describe('Distribution', () => {
  it('getFormattedBuckets', () => {
    const buckets = [
      { key: 0, count: 0 },
      { key: 20, count: 0 },
      { key: 40, count: 0 },
      { key: 60, count: 5, transactionId: 'someTransactionId', sampled: true },
      {
        key: 80,
        count: 100,
        transactionId: 'anotherTransactionId',
        sampled: true
      }
    ];
    expect(getFormattedBuckets(buckets, 20)).toEqual([
      { x: 20, x0: 0, y: 0, style: {} },
      { x: 40, x0: 20, y: 0, style: {} },
      { x: 60, x0: 40, y: 0, style: {} },
      {
        x: 80,
        x0: 60,
        y: 5,
        sampled: true,
        transactionId: 'someTransactionId',
        style: { cursor: 'pointer' }
      },
      {
        x: 100,
        x0: 80,
        y: 100,
        sampled: true,
        transactionId: 'anotherTransactionId',
        style: { cursor: 'pointer' }
      }
    ]);
  });
});
