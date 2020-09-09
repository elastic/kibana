/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockOptions = {
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  timerange: { from: '2020-09-08T13:32:02.875Z', to: '2020-09-09T13:32:02.875Z' },
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  stackByField: 'event.module',
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
    aggregations: {
      alertsGroup: {
        terms: {
          field: 'event.module',
          missing: 'All others',
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          alerts: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599571922875, max: 1599658322875 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
          {
            bool: {
              filter: [
                {
                  bool: { should: [{ match: { 'event.kind': 'alert' } }], minimum_should_match: 1 },
                },
              ],
            },
          },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T13:32:02.875Z',
                lte: '2020-09-09T13:32:02.875Z',
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
