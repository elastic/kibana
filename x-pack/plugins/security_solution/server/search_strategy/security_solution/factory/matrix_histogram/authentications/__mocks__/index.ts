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
  histogramType: MatrixHistogramType.authentications,
  timerange: { interval: '12h', from: '2020-09-08T15:22:00.325Z', to: '2020-09-09T15:22:00.325Z' },
  stackByField: 'event.outcome',
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
          field: 'event.outcome',
          include: ['success', 'failure'],
          order: { _count: 'desc' },
          size: 2,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599578520325, max: 1599664920325 },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          { bool: { must: [{ term: { 'event.category': 'authentication' } }] } },
          {
            range: {
              '@timestamp': {
                gte: '2020-09-08T15:22:00.325Z',
                lte: '2020-09-09T15:22:00.325Z',
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
