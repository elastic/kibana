/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThroughputChartsResponse } from '..';

export const timeseriesResponse = ({
  took: 43,
  timed_out: false,
  _shards: {
    total: 105,
    successful: 105,
    skipped: 101,
    failed: 0,
  },
  hits: {
    total: {
      value: 16,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    throughput: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'A Custom Bucket (that should be last)',
          doc_count: 0,
          timeseries: { buckets: [] },
        },
        {
          key: 'HTTP 2xx',
          doc_count: 9,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-12-07T13:02:00.000Z',
                key: 1607346120000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
              {
                key_as_string: '2020-12-07T13:02:30.000Z',
                key: 1607346150000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-12-07T13:03:00.000Z',
                key: 1607346180000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:03:30.000Z',
                key: 1607346210000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:04:00.000Z',
                key: 1607346240000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
              {
                key_as_string: '2020-12-07T13:04:30.000Z',
                key: 1607346270000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
              {
                key_as_string: '2020-12-07T13:05:00.000Z',
                key: 1607346300000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:05:30.000Z',
                key: 1607346330000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
              {
                key_as_string: '2020-12-07T13:06:00.000Z',
                key: 1607346360000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
            ],
          },
        },
        {
          key: 'HTTP 5xx',
          doc_count: 5,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-12-07T13:02:00.000Z',
                key: 1607346120000,
                doc_count: 3,
                count: {
                  value: 3,
                },
              },
              {
                key_as_string: '2020-12-07T13:02:30.000Z',
                key: 1607346150000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
              {
                key_as_string: '2020-12-07T13:03:00.000Z',
                key: 1607346180000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:03:30.000Z',
                key: 1607346210000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:04:00.000Z',
                key: 1607346240000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:04:30.000Z',
                key: 1607346270000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:05:00.000Z',
                key: 1607346300000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:05:30.000Z',
                key: 1607346330000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:06:00.000Z',
                key: 1607346360000,
                doc_count: 0,
                count: {
                  value: 0,
                },
              },
              {
                key_as_string: '2020-12-07T13:06:30.000Z',
                key: 1607346390000,
                doc_count: 1,
                count: {
                  value: 1,
                },
              },
            ],
          },
        },
        {
          key: 'HTTP 4xx',
          doc_count: 2,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-12-07T13:02:00.000Z',
                key: 1607346120000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
            ],
          },
        },
        {
          key: 'HTTP 3xx',
          doc_count: 2,
          timeseries: {
            buckets: [
              {
                key_as_string: '2020-12-07T13:02:00.000Z',
                key: 1607346120000,
                doc_count: 2,
                count: {
                  value: 2,
                },
              },
            ],
          },
        },
      ],
    },
  },
} as unknown) as ThroughputChartsResponse;
