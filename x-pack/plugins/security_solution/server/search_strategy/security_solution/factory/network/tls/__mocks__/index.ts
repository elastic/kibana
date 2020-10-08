/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  Direction,
  FlowTargetSourceDest,
  NetworkQueries,
  NetworkTlsFields,
  NetworkTlsRequestOptions,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkTlsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  factoryQueryType: NetworkQueries.tls,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  flowTarget: FlowTargetSourceDest.source,
  ip: '',
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  sort: { field: NetworkTlsFields._id, direction: Direction.desc },
  timerange: { interval: '12h', from: '2020-09-13T09:58:58.637Z', to: '2020-09-14T09:58:58.637Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 62,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: 0, max_score: 0, hits: [] },
    aggregations: {
      sha1: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
      count: { value: 0 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  ...mockSearchStrategyResponse,
  edges: [],
  inspect: {
    dsl: [
      JSON.stringify(
        {
          allowNoIndices: true,
          index: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          ignoreUnavailable: true,
          body: {
            aggs: {
              count: { cardinality: { field: 'tls.server.hash.sha1' } },
              sha1: {
                terms: { field: 'tls.server.hash.sha1', size: 10, order: { _key: 'desc' } },
                aggs: {
                  issuers: { terms: { field: 'tls.server.issuer' } },
                  subjects: { terms: { field: 'tls.server.subject' } },
                  not_after: { terms: { field: 'tls.server.not_after' } },
                  ja3: { terms: { field: 'tls.server.ja3s' } },
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
                        gte: '2020-09-13T09:58:58.637Z',
                        lte: '2020-09-14T09:58:58.637Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
            size: 0,
            track_total_hits: false,
          },
        },
        null,
        2
      ),
    ],
  },
  pageInfo: { activePage: 0, fakeTotalCount: 0, showMorePagesIndicator: false },
  totalCount: 0,
};

export const expectedDsl = {
  allowNoIndices: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignoreUnavailable: true,
  body: {
    aggs: {
      count: { cardinality: { field: 'tls.server.hash.sha1' } },
      sha1: {
        terms: { field: 'tls.server.hash.sha1', size: 10, order: { _key: 'desc' } },
        aggs: {
          issuers: { terms: { field: 'tls.server.issuer' } },
          subjects: { terms: { field: 'tls.server.subject' } },
          not_after: { terms: { field: 'tls.server.not_after' } },
          ja3: { terms: { field: 'tls.server.ja3s' } },
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
                gte: '2020-09-13T09:58:58.637Z',
                lte: '2020-09-14T09:58:58.637Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
    size: 0,
    track_total_hits: false,
  },
};
