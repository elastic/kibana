/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  Direction,
  NetworkDnsFields,
  NetworkDnsRequestOptions,
  NetworkQueries,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkDnsRequestOptions = {
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
  factoryQueryType: NetworkQueries.dns,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  isPtrIncluded: false,
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.desc },
  timerange: { interval: '12h', from: '2020-09-13T09:00:43.249Z', to: '2020-09-14T09:00:43.249Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 28,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { max_score: 0, hits: [], total: 0 },
    aggregations: {
      dns_count: { value: 2 },
      dns_name_query_count: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'google.com',
            doc_count: 1,
            unique_domains: { value: 1 },
            dns_bytes_in: { value: 0 },
            dns_bytes_out: { value: 0 },
          },
          {
            key: 'google.internal',
            doc_count: 1,
            unique_domains: { value: 1 },
            dns_bytes_in: { value: 0 },
            dns_bytes_out: { value: 0 },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 28,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { max_score: 0, hits: [] },
    aggregations: {
      dns_count: { value: 2 },
      dns_name_query_count: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'google.com',
            doc_count: 1,
            unique_domains: { value: 1 },
            dns_bytes_in: { value: 0 },
            dns_bytes_out: { value: 0 },
          },
          {
            key: 'google.internal',
            doc_count: 1,
            unique_domains: { value: 1 },
            dns_bytes_in: { value: 0 },
            dns_bytes_out: { value: 0 },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
  edges: [
    {
      node: {
        _id: 'google.com',
        dnsBytesIn: 0,
        dnsBytesOut: 0,
        dnsName: 'google.com',
        queryCount: 1,
        uniqueDomains: 1,
      },
      cursor: { value: 'google.com', tiebreaker: null },
    },
    {
      node: {
        _id: 'google.internal',
        dnsBytesIn: 0,
        dnsBytesOut: 0,
        dnsName: 'google.internal',
        queryCount: 1,
        uniqueDomains: 1,
      },
      cursor: { value: 'google.internal', tiebreaker: null },
    },
  ],
  inspect: {
    dsl: [
      JSON.stringify(
        {
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
                  size: 1000000,
                },
                aggs: {
                  bucket_sort: {
                    bucket_sort: {
                      sort: [
                        {
                          unique_domains: {
                            order: 'desc',
                          },
                        },
                        { _key: { order: 'asc' } },
                      ],
                      from: 0,
                      size: 10,
                    },
                  },
                  unique_domains: { cardinality: { field: 'dns.question.name' } },
                  dns_bytes_in: { sum: { field: 'source.bytes' } },
                  dns_bytes_out: { sum: { field: 'destination.bytes' } },
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
                        gte: '2020-09-13T09:00:43.249Z',
                        lte: '2020-09-14T09:00:43.249Z',
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
        },
        null,
        2
      ),
    ],
  },
  pageInfo: { activePage: 0, fakeTotalCount: 2, showMorePagesIndicator: false },
  totalCount: 2,
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
          size: 1000000,
        },
        aggs: {
          bucket_sort: {
            bucket_sort: {
              sort: [
                {
                  unique_domains: {
                    order: 'desc',
                  },
                },
                { _key: { order: 'asc' } },
              ],
              from: 0,
              size: 10,
            },
          },
          unique_domains: { cardinality: { field: 'dns.question.name' } },
          dns_bytes_in: { sum: { field: 'source.bytes' } },
          dns_bytes_out: { sum: { field: 'destination.bytes' } },
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
                gte: '2020-09-13T09:00:43.249Z',
                lte: '2020-09-14T09:00:43.249Z',
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
