/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from './query_utils';

describe('ML - query utils', () => {
  describe('buildBaseFilterCriteria', () => {
    const earliestMs = 1483228800000; // 1 Jan 2017 00:00:00
    const latestMs = 1485907199000; // 31 Jan 2017 23:59:59
    const query = {
      query_string: {
        query: 'region:sa-east-1',
        analyze_wildcard: true,
        default_field: '*',
      },
    };

    test('returns correct criteria for time range', () => {
      expect(buildBaseFilterCriteria('timestamp', earliestMs, latestMs)).toEqual([
        {
          range: {
            timestamp: {
              gte: earliestMs,
              lte: latestMs,
              format: 'epoch_millis',
            },
          },
        },
      ]);
    });

    test('returns correct criteria for time range and query', () => {
      expect(buildBaseFilterCriteria('timestamp', earliestMs, latestMs, query)).toEqual([
        {
          range: {
            timestamp: {
              gte: earliestMs,
              lte: latestMs,
              format: 'epoch_millis',
            },
          },
        },
        query,
      ]);
    });
  });

  describe('buildSamplerAggregation', () => {
    const testAggs = {
      bytes_stats: {
        stats: { field: 'bytes' },
      },
    };

    test('returns wrapped sampler aggregation for sampler shard size of 1000', () => {
      expect(buildSamplerAggregation(testAggs, 1000)).toEqual({
        sample: {
          sampler: {
            shard_size: 1000,
          },
          aggs: testAggs,
        },
      });
    });

    test('returns un-sampled aggregation as-is for sampler shard size of 0', () => {
      expect(buildSamplerAggregation(testAggs, 0)).toEqual(testAggs);
    });
  });

  describe('getSamplerAggregationsResponsePath', () => {
    test('returns correct path for sampler shard size of 1000', () => {
      expect(getSamplerAggregationsResponsePath(1000)).toEqual(['sample']);
    });

    test('returns correct path for sampler shard size of 0', () => {
      expect(getSamplerAggregationsResponsePath(0)).toEqual([]);
    });
  });
});
