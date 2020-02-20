/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse } from '../fetcher';

export const mlAnomalyResponse: ESResponse = ({
  took: 3,
  timed_out: false,
  _shards: {
    total: 5,
    successful: 5,
    skipped: 0,
    failed: 0
  },
  hits: {
    total: 10,
    max_score: 0,
    hits: []
  },
  aggregations: {
    ml_avg_response_times: {
      buckets: [
        {
          key_as_string: '2018-07-02T09:16:40.000Z',
          key: 0,
          doc_count: 0,
          anomaly_score: {
            value: null
          },
          upper: {
            value: 200
          },
          lower: {
            value: 20
          }
        },
        {
          key_as_string: '2018-07-02T09:25:00.000Z',
          key: 5000,
          doc_count: 4,
          anomaly_score: {
            value: null
          },
          upper: {
            value: null
          },
          lower: {
            value: null
          }
        },
        {
          key_as_string: '2018-07-02T09:33:20.000Z',
          key: 10000,
          doc_count: 0,
          anomaly_score: {
            value: null
          },
          upper: {
            value: null
          },
          lower: {
            value: null
          }
        },
        {
          key_as_string: '2018-07-02T09:41:40.000Z',
          key: 15000,
          doc_count: 2,
          anomaly_score: {
            value: 90
          },
          upper: {
            value: 100
          },
          lower: {
            value: 20
          }
        },
        {
          key_as_string: '2018-07-02T09:50:00.000Z',
          key: 20000,
          doc_count: 0,
          anomaly_score: {
            value: null
          },
          upper: {
            value: null
          },
          lower: {
            value: null
          }
        },
        {
          key_as_string: '2018-07-02T09:58:20.000Z',
          key: 25000,
          doc_count: 2,
          anomaly_score: {
            value: 100
          },
          upper: {
            value: 50
          },
          lower: {
            value: 10
          }
        },
        {
          key_as_string: '2018-07-02T10:15:00.000Z',
          key: 30000,
          doc_count: 2,
          anomaly_score: {
            value: 0
          },
          upper: {
            value: null
          },
          lower: {
            value: null
          }
        }
      ]
    }
  }
} as unknown) as ESResponse;
