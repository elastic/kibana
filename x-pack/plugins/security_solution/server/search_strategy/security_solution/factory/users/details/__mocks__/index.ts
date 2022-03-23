/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import { UsersQueries } from '../../../../../../../common/search_strategy/security_solution/users';

import { UserDetailsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/users/details';

export const mockOptions: UserDetailsRequestOptions = {
  defaultIndex: ['test_indices*'],
  docValueFields: [
    {
      field: '@timestamp',
      format: 'date_time',
    },
  ],
  factoryQueryType: UsersQueries.details,
  filterQuery:
    '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"user.name":{"query":"test_user"}}}],"should":[],"must_not":[]}}',
  timerange: {
    interval: '12h',
    from: '2020-09-02T15:17:13.678Z',
    to: '2020-09-03T15:17:13.678Z',
  },
  params: {},
  userName: 'bastion00.siem.estc.dev',
} as UserDetailsRequestOptions;

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  rawResponse: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 1,
      failed: 0,
    },
    hits: {
      max_score: null,
      hits: [],
    },
    aggregations: {
      host_ip: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 665,
        buckets: [
          {
            key: '11.245.5.152',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '149.175.90.37',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '16.3.124.77',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '161.120.111.159',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '179.124.88.33',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '203.248.113.63',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '205.6.104.210',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '209.233.30.0',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '238.165.244.247',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
          {
            key: '29.73.212.149',
            doc_count: 133,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
        ],
      },
      first_seen: {
        value: 1644837532000,
        value_as_string: '2022-02-14T11:18:52.000Z',
      },
      last_seen: {
        value: 1644837532000,
        value_as_string: '2022-02-14T11:18:52.000Z',
      },
      user_domain: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'NT AUTHORITY',
            doc_count: 1905,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
        ],
      },
      user_id: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'S-1-5-18',
            doc_count: 1995,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
        ],
      },
      user_name: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'SYSTEM',
            doc_count: 1995,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
        ],
      },
      host_os_family: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'Windows',
            doc_count: 1995,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
        ],
      },
      host_os_name: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'Windows',
            doc_count: 1995,
            timestamp: {
              value: 1644837532000,
              value_as_string: '2022-02-14T11:18:52.000Z',
            },
          },
        ],
      },
    },
  },
  isPartial: false,
  isRunning: false,
  total: 2,
  loaded: 2,
};
