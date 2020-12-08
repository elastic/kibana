/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyChartsSearchResponse } from '..';

export const timeseriesResponse = ({
  took: 34,
  timed_out: false,
  _shards: {
    total: 105,
    successful: 105,
    skipped: 101,
    failed: 0,
  },
  hits: {
    total: {
      value: 18,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    latency: {
      buckets: [
        {
          key_as_string: '2020-12-07T13:00:30.000Z',
          key: 1607346030000,
          doc_count: 1,
          pct: {
            values: {
              '95.0': 13888.0,
              '99.0': 13888.0,
            },
          },
          avg: {
            value: 13942.0,
          },
        },
        {
          key_as_string: '2020-12-07T13:01:00.000Z',
          key: 1607346060000,
          doc_count: 3,
          pct: {
            values: {
              '95.0': 23552.0,
              '99.0': 23552.0,
            },
          },
          avg: {
            value: 19322.333333333332,
          },
        },
        {
          key_as_string: '2020-12-07T13:01:30.000Z',
          key: 1607346090000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-12-07T13:02:00.000Z',
          key: 1607346120000,
          doc_count: 8,
          pct: {
            values: {
              '95.0': 378864.0,
              '99.0': 378864.0,
            },
          },
          avg: {
            value: 68323.875,
          },
        },
        {
          key_as_string: '2020-12-07T13:02:30.000Z',
          key: 1607346150000,
          doc_count: 3,
          pct: {
            values: {
              '95.0': 7.392448e7,
              '99.0': 7.392448e7,
            },
          },
          avg: {
            value: 2.5222877333333332e7,
          },
        },
        {
          key_as_string: '2020-12-07T13:03:00.000Z',
          key: 1607346180000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-12-07T13:03:30.000Z',
          key: 1607346210000,
          doc_count: 0,
          pct: {
            values: {
              '95.0': null,
              '99.0': null,
            },
          },
          avg: {
            value: null,
          },
        },
        {
          key_as_string: '2020-12-07T13:04:00.000Z',
          key: 1607346240000,
          doc_count: 2,
          pct: {
            values: {
              '95.0': 38016.0,
              '99.0': 38016.0,
            },
          },
          avg: {
            value: 29134.0,
          },
        },
        {
          key_as_string: '2020-12-07T13:04:30.000Z',
          key: 1607346270000,
          doc_count: 1,
          pct: {
            values: {
              '95.0': 9792.0,
              '99.0': 9792.0,
            },
          },
          avg: {
            value: 9837.0,
          },
        },
      ],
    },
    overall_avg_duration: {
      value: 4241957.611111111,
    },
  },
} as unknown) as LatencyChartsSearchResponse;
