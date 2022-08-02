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
import type { RawBucket } from '../../types';

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

  it(`it prefers to populate 'key' using the RawBucket's 'key_as_string' when available, because it contains formatted dates`, () => {
    const bucketWithOptionalKeyAsString: RawBucket = {
      key: '1658955590866',
      key_as_string: '2022-07-27T20:59:50.866Z', // <-- should be preferred over `key` when present
      doc_count: 1,
      maxRiskSubAggregation: { value: 21 },
      stackByField1: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [{ key: 'Host-vmdx1cnu3m', doc_count: 1 }],
      },
    };

    expect(
      flattenBucket({ bucket: bucketWithOptionalKeyAsString, maxRiskSubAggregations })
    ).toEqual([
      {
        doc_count: 1,
        key: bucketWithOptionalKeyAsString.key_as_string, // <-- uses the preferred `key_as_string`
        maxRiskSubAggregation: { value: 21 },
        stackByField1DocCount: 1,
        stackByField1Key: 'Host-vmdx1cnu3m',
      },
    ]);
  });

  it(`it prefers to populate 'stackByField1Key' using the 'stackByField1.buckets[n].key_as_string' when available, because it contains formatted dates`, () => {
    const keyAsString = '2022-07-27T09:33:19.329Z';

    const bucketWithKeyAsString: RawBucket = {
      key: 'Threshold rule',
      doc_count: 1,
      maxRiskSubAggregation: { value: 99 },
      stackByField1: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '1658914399329',
            key_as_string: keyAsString, // <-- should be preferred over `stackByField1.buckets[n].key` when present
            doc_count: 1,
          },
        ],
      },
    };

    expect(flattenBucket({ bucket: bucketWithKeyAsString, maxRiskSubAggregations })).toEqual([
      {
        doc_count: 1,
        key: 'Threshold rule',
        maxRiskSubAggregation: { value: 99 },
        stackByField1DocCount: 1,
        stackByField1Key: keyAsString, // <-- uses the preferred `stackByField1.buckets[n].key_as_string`
      },
    ]);
  });

  it(`returns an empty array when there's nothing to flatten, because stackByField1 is undefined`, () => {
    expect(
      flattenBucket({ bucket: bucketsWithoutStackByField1[0], maxRiskSubAggregations })
    ).toEqual([]);
  });
});
