/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockOptions = {
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  timerange: { from: '2020-09-08T14:18:23.719Z', to: '2020-09-09T14:18:23.719Z' },
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  stackByField: 'dns.question.registered_domain',
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
      NetworkDns: {
        date_histogram: { field: '@timestamp', fixed_interval: '2700000ms' },
        aggs: {
          dns: {
            terms: {
              field: 'dns.question.registered_domain',
              order: { orderAgg: 'desc' },
              size: 10,
            },
            aggs: { orderAgg: { cardinality: { field: 'dns.question.name' } } },
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
                gte: '2020-09-08T14:18:23.719Z',
                lte: '2020-09-09T14:18:23.719Z',
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
