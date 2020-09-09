/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockOptions = {
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  timerange: { from: '2020-09-08T14:23:04.482Z', to: '2020-09-09T14:23:04.482Z' },
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  stackByField: 'event.action',
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
      eventActionGroup: {
        terms: {
          field: 'event.action',
          missing: 'All others',
          order: { _count: 'desc' },
          size: 10,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599574984482, max: 1599661384482 },
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
            range: {
              '@timestamp': {
                gte: '2020-09-08T14:23:04.482Z',
                lte: '2020-09-09T14:23:04.482Z',
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
