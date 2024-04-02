/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator, InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { createBucketSelector } from './create_bucket_selector';

describe('createBucketSelector', () => {
  it('should convert tx threshold from bits to byte', () => {
    const inventoryMetricConditions: InventoryMetricConditions = {
      metric: 'tx',
      timeSize: 5,
      timeUnit: 'm',
      threshold: [8],
      comparator: Comparator.GT_OR_EQ,
      warningThreshold: [16],
      warningComparator: Comparator.LT_OR_EQ,
    };
    expect(createBucketSelector('tx', inventoryMetricConditions)).toEqual({
      selectedBucket: {
        bucket_selector: {
          buckets_path: {
            shouldTrigger: 'shouldTrigger',
            shouldWarn: 'shouldWarn',
          },
          script:
            '(params.shouldWarn != null && params.shouldWarn > 0) || (params.shouldTrigger != null && params.shouldTrigger > 0)',
        },
      },
      shouldTrigger: {
        bucket_script: {
          buckets_path: {
            value: 'tx',
          },
          script: {
            params: {
              // Threshold has been converted from 8 bits to 1 byte
              threshold: 1,
            },
            source: 'params.value >= params.threshold ? 1 : 0',
          },
        },
      },
      shouldWarn: {
        bucket_script: {
          buckets_path: {
            value: 'tx',
          },
          script: {
            params: {
              // Threshold has been converted from 16 bits to 2 byte
              threshold: 2,
            },
            source: 'params.value <= params.threshold ? 1 : 0',
          },
        },
      },
    });
  });
});
