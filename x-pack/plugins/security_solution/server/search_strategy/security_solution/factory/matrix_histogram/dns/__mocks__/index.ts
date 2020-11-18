/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  MatrixHistogramType,
  NetworkDnsFields,
} from '../../../../../../../common/search_strategy';

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
  isPtrIncluded: false,
  sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.desc },
  timerange: { interval: '12h', from: '2020-09-08T15:41:15.528Z', to: '2020-09-09T15:41:15.529Z' },
  stackByField: 'dns.question.registered_domain',
};

export const expectedDsl = {
  allowNoIndices: true,
  body: {
    aggregations: {
      dns_count: { cardinality: { field: 'dns.question.registered_domain' } },
      dns_name_query_count: {
        aggs: {
          bucket_sort: {
            bucket_sort: {
              from: 0,
              size: 10,
              sort: [{ unique_domains: { order: 'desc' } }, { _key: { order: 'asc' } }],
            },
          },
          dns_question_name: {
            date_histogram: {
              extended_bounds: { max: 1599666075529, min: 1599579675528 },
              field: '@timestamp',
              fixed_interval: '2700000ms',
              min_doc_count: 0,
            },
          },
          unique_domains: { cardinality: { field: 'dns.question.name' } },
        },
        terms: { field: 'dns.question.registered_domain', size: 1000000 },
      },
    },
    docvalue_fields: undefined,
    query: {
      bool: {
        filter: [
          { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-08T15:41:15.528Z',
                lte: '2020-09-09T15:41:15.529Z',
              },
            },
          },
        ],
        must_not: [{ term: { 'dns.question.type': { value: 'PTR' } } }],
      },
    },
  },
  ignoreUnavailable: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  size: 0,
  track_total_hits: false,
};
