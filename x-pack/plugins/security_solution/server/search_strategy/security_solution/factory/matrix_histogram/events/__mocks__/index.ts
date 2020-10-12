/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MatrixHistogramQuery,
  MatrixHistogramRequestOptions,
  MatrixHistogramType,
} from '../../../../../../../common/search_strategy';

export const mockOptions: MatrixHistogramRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: MatrixHistogramQuery,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.events,
  timerange: { interval: '12h', from: '2020-09-08T16:11:26.215Z', to: '2020-09-09T16:11:26.215Z' },
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
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
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
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
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

export const expectedThresholdDsl = {
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
          field: 'host.name',
          order: { _count: 'desc' },
          size: 10,
          min_doc_count: 200,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
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
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
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

export const expectedThresholdMissingFieldDsl = {
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
          min_doc_count: 200,
        },
        aggs: {
          events: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599581486215, max: 1599667886215 },
            },
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
                gte: '2020-09-08T16:11:26.215Z',
                lte: '2020-09-09T16:11:26.215Z',
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
