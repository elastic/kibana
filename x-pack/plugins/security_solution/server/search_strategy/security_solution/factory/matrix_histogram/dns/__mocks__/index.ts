/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MatrixHistogramType } from '../../../../../../../common/search_strategy';

export const mockOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.dns,
  timerange: { interval: '12h', from: '2020-09-08T15:41:15.528Z', to: '2020-09-09T15:41:15.529Z' },
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
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T15:41:15.528Z',
                lte: '2020-09-09T15:41:15.529Z',
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
