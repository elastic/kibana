/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenBucket } from './flatten_bucket';
import {
  bucketsWithStackByField1,
  bucketsWithoutStackByField1,
  maxRiskSubAggregations,
} from './mocks/mock_buckets';

describe('flattenBucket', () => {
  it(`returns the expected flattened buckets when stackByField1 has buckets`, () => {
    expect(flattenBucket({ bucket: bucketsWithStackByField1[0], maxRiskSubAggregations })).toEqual([
      {
        doc_count: 34,
        key: 'matches everything',
        maxRiskSubAggregation: { value: 21 },
        stackByField1DocCount: 12,
        stackByField1Key: 'Host-k8iyfzraq9',
      },
      {
        doc_count: 34,
        key: 'matches everything',
        maxRiskSubAggregation: { value: 21 },
        stackByField1DocCount: 10,
        stackByField1Key: 'Host-ao1a4wu7vn',
      },
      {
        doc_count: 34,
        key: 'matches everything',
        maxRiskSubAggregation: { value: 21 },
        stackByField1DocCount: 7,
        stackByField1Key: 'Host-3fbljiq8rj',
      },
      {
        doc_count: 34,
        key: 'matches everything',
        maxRiskSubAggregation: { value: 21 },
        stackByField1DocCount: 5,
        stackByField1Key: 'Host-r4y6xi92ob',
      },
    ]);
  });

  it(`returns an empty array when there's nothing to flatten, because stackByField1 is undefined`, () => {
    expect(
      flattenBucket({ bucket: bucketsWithoutStackByField1[0], maxRiskSubAggregations })
    ).toEqual([]);
  });
});
