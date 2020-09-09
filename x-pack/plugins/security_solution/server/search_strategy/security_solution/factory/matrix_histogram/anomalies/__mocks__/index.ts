/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockOptions = {
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"should":[],"minimum_should_match":1}},{"match_phrase":{"result_type":"record"}},null,{"range":{"record_score":{"gte":50}}}],"should":[],"must_not":[]}}',
  timerange: { from: '2020-09-08T13:51:04.932Z', to: '2020-09-09T13:51:04.933Z' },
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  stackByField: 'job_id',
};

export const expectedDsl = {
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  allowNoIndices: true,
  ignoreUnavailable: true,
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
              extended_bounds: { min: 1599573064932, max: 1599659464933 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"should":[],"minimum_should_match":1}},{"match_phrase":{"result_type":"record"}},null,{"range":{"record_score":{"gte":50}}}],"should":[],"must_not":[]}}',
          {
            range: {
              timestamp: {
                gte: '2020-09-08T13:51:04.932Z',
                lte: '2020-09-09T13:51:04.933Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    size: 0,
    track_total_hits: true,
  },
};
