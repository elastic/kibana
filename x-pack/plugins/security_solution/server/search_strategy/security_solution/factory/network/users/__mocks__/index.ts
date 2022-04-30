/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  Direction,
  FlowTarget,
  NetworkQueries,
  NetworkUsersFields,
  NetworkUsersRequestOptions,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkUsersRequestOptions = {
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
  factoryQueryType: NetworkQueries.users,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  flowTarget: FlowTarget.source,
  ip: '10.142.0.7',
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  sort: { field: NetworkUsersFields.name, direction: Direction.asc },
  timerange: { interval: '12h', from: '2020-09-13T10:16:46.870Z', to: '2020-09-14T10:16:46.870Z' },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 12,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: 0, max_score: 0, hits: [] },
    aggregations: {
      user_count: { value: 3 },
      users: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: '_apt',
            doc_count: 34,
            groupName: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            groupId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            id: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: '104', doc_count: 34 }],
            },
          },
          {
            key: 'root',
            doc_count: 8852,
            groupName: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            groupId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            id: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: '0', doc_count: 8852 }],
            },
          },
          {
            key: 'tsg',
            doc_count: 16,
            groupName: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            groupId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            id: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: '1005', doc_count: 16 }],
            },
          },
        ],
      },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  ...mockSearchStrategyResponse,
  edges: [
    {
      node: {
        _id: '_apt',
        user: { id: ['104'], name: '_apt', groupId: [], groupName: [], count: 34 },
      },
      cursor: { value: '_apt', tiebreaker: null },
    },
    {
      node: {
        _id: 'root',
        user: { id: ['0'], name: 'root', groupId: [], groupName: [], count: 8852 },
      },
      cursor: { value: 'root', tiebreaker: null },
    },
    {
      node: {
        _id: 'tsg',
        user: { id: ['1005'], name: 'tsg', groupId: [], groupName: [], count: 16 },
      },
      cursor: { value: 'tsg', tiebreaker: null },
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
          track_total_hits: false,
          body: {
            aggs: {
              user_count: { cardinality: { field: 'user.name' } },
              users: {
                terms: { field: 'user.name', size: 10, order: { _key: 'asc' } },
                aggs: {
                  id: { terms: { field: 'user.id' } },
                  groupId: { terms: { field: 'user.group.id' } },
                  groupName: { terms: { field: 'user.group.name' } },
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
                        gte: '2020-09-13T10:16:46.870Z',
                        lte: '2020-09-14T10:16:46.870Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                  { term: { 'source.ip': '10.142.0.7' } },
                ],
                must_not: [{ term: { 'event.category': 'authentication' } }],
              },
            },
            size: 0,
          },
        },
        null,
        2
      ),
    ],
  },
  pageInfo: { activePage: 0, fakeTotalCount: 3, showMorePagesIndicator: false },
  totalCount: 3,
};

export const expectedDsl = {
  allow_no_indices: true,
  track_total_hits: false,
  body: {
    aggs: {
      user_count: { cardinality: { field: 'user.name' } },
      users: {
        aggs: {
          groupId: { terms: { field: 'user.group.id' } },
          groupName: { terms: { field: 'user.group.name' } },
          id: { terms: { field: 'user.id' } },
        },
        terms: { field: 'user.name', order: { _key: 'asc' }, size: 10 },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-13T10:16:46.870Z',
                lte: '2020-09-14T10:16:46.870Z',
              },
            },
          },
          { term: { 'source.ip': '10.142.0.7' } },
        ],
        must_not: [{ term: { 'event.category': 'authentication' } }],
      },
    },
    size: 0,
  },
  ignore_unavailable: true,
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
};
