/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAggregationResults } from './parse_aggregation_results';

describe('parseAggregationResults', () => {
  it('correctly parses results for count over all', () => {
    expect(
      parseAggregationResults({
        isCountAgg: true,
        isGroupAgg: false,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 491, max_score: null, hits: [] },
        },
      })
    ).toEqual([
      {
        group: 'all documents',
        count: 491,
      },
    ]);
  });

  it('correctly parses results for count over top N termField', () => {
    expect(
      parseAggregationResults({
        isCountAgg: true,
        isGroupAgg: true,
        esResult: {
          took: 233,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 103,
              buckets: [
                {
                  key: 'execute',
                  doc_count: 120,
                },
                {
                  key: 'execute-start',
                  doc_count: 120,
                },
                {
                  key: 'active-instance',
                  doc_count: 100,
                },
                {
                  key: 'execute-action',
                  doc_count: 100,
                },
                {
                  key: 'new-instance',
                  doc_count: 100,
                },
              ],
            },
          },
        },
      })
    ).toEqual([
      {
        group: 'execute',
        count: 120,
      },
      {
        group: 'execute-start',
        count: 120,
      },
      {
        group: 'active-instance',
        count: 100,
      },
      {
        group: 'execute-action',
        count: 100,
      },
      {
        group: 'new-instance',
        count: 100,
      },
    ]);
  });

  it('correctly parses results for aggregate metric over all', () => {
    expect(
      parseAggregationResults({
        isCountAgg: false,
        isGroupAgg: false,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            metricAgg: {
              value: 3578195238.095238,
            },
          },
        },
      })
    ).toEqual([
      {
        group: 'all documents',
        count: 643,
        value: 3578195238.095238,
      },
    ]);
  });

  it('correctly parses results for aggregate metric over top N termField', () => {
    expect(
      parseAggregationResults({
        isCountAgg: false,
        isGroupAgg: true,
        esResult: {
          took: 238,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 643, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 240,
              buckets: [
                {
                  key: 'execute-action',
                  doc_count: 120,
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'execute-start',
                  doc_count: 139,
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'starting',
                  doc_count: 1,
                  metricAgg: {
                    value: null,
                  },
                },
                {
                  key: 'recovered-instance',
                  doc_count: 120,
                  metricAgg: {
                    value: 12837500000,
                  },
                },
                {
                  key: 'execute',
                  doc_count: 139,
                  metricAgg: {
                    value: 137647482.0143885,
                  },
                },
              ],
            },
          },
        },
      })
    ).toEqual([
      {
        group: 'execute-action',
        count: 120,
        value: null,
      },
      {
        group: 'execute-start',
        count: 139,
        value: null,
      },
      {
        group: 'starting',
        count: 1,
        value: null,
      },
      {
        group: 'recovered-instance',
        count: 120,
        value: 12837500000,
      },
      {
        group: 'execute',
        count: 139,
        value: 137647482.0143885,
      },
    ]);
  });

  // it('correctly parses results with top hits results', () => {});
});
