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
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"bool":{"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.alerts,
  timerange: { interval: '12h', from: '2020-09-08T14:23:04.482Z', to: '2020-09-09T14:23:04.482Z' },
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
              extended_bounds: { min: 1599574984482, max: 1599661384482 },
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
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [{ exists: { field: 'host.name' } }],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
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
