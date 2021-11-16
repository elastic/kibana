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
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.dns,
  isPtrIncluded: false,
  timerange: { interval: '12h', from: '2020-09-08T15:41:15.528Z', to: '2020-09-09T15:41:15.529Z' },
  stackByField: 'dns.question.registered_domain',
};

export const expectedDsl = {
  allow_no_indices: true,
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
  ignore_unavailable: true,
  body: {
    aggregations: {
      dns_count: { cardinality: { field: 'dns.question.registered_domain' } },
      dns_name_query_count: {
        terms: {
          field: 'dns.question.registered_domain',
          order: { unique_domains: 'desc' },
          size: 10,
        },
        aggs: {
          unique_domains: { cardinality: { field: 'dns.question.name' } },
          dns_question_name: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
              extended_bounds: { min: 1599579675528, max: 1599666075529 },
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
                gte: '2020-09-08T15:41:15.528Z',
                lte: '2020-09-09T15:41:15.529Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
        must_not: [{ term: { 'dns.question.type': { value: 'PTR' } } }],
      },
    },
  },
  size: 0,
  track_total_hits: false,
};
