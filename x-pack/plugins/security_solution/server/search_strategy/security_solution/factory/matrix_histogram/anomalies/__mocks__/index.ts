/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MatrixHistogramType } from '../../../../../../../common/search_strategy';

export const mockOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"should":[],"minimum_should_match":1}},{"match_phrase":{"result_type":"record"}},null,{"range":{"record_score":{"gte":50}}}],"should":[{"exists":{"field":"source.ip"}},{"exists":{"field":"destination.ip"}}],"must_not":[],"minimum_should_match":1}}',
  histogramType: MatrixHistogramType.anomalies,
  timerange: { interval: '12h', from: '2020-09-08T15:14:35.566Z', to: '2020-09-09T15:14:35.566Z' },
  stackByField: 'job_id',
};

export const expectedDsl = {
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allow_no_indices: true,
  ignore_unavailable: true,
  track_total_hits: true,
  body: {
    aggs: {
      anomalyActionGroup: {
        terms: { field: 'job_id', order: { _count: 'desc' }, size: 10 },
        aggs: {
          anomalies: {
            date_histogram: {
              field: 'timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599578075566, max: 1599664475566 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            bool: {
              must: [],
              filter: [
                { match_all: {} },
                { bool: { should: [], minimum_should_match: 1 } },
                { match_phrase: { result_type: 'record' } },
                null,
                { range: { record_score: { gte: 50 } } },
              ],
              should: [{ exists: { field: 'source.ip' } }, { exists: { field: 'destination.ip' } }],
              must_not: [],
              minimum_should_match: 1,
            },
          },
          {
            range: {
              timestamp: {
                gte: '2020-09-08T15:14:35.566Z',
                lte: '2020-09-09T15:14:35.566Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    size: 0,
  },
};
