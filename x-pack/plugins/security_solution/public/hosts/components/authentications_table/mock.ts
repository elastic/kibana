/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { HostAuthenticationsStrategyResponse } from '../../../../common/search_strategy/security_solution/hosts/authentications';

export const mockData: { Authentications: HostAuthenticationsStrategyResponse } = {
  Authentications: {
    rawResponse: {
      took: 880,
      timed_out: false,
      _shards: {
        total: 26,
        successful: 26,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: 2,
        hits: [],
      },
      aggregations: {
        group_by_users: {
          buckets: [
            {
              key: 'SYSTEM',
              doc_count: 4,
              failures: {
                doc_count: 0,
                lastFailure: { hits: { total: 0, max_score: null, hits: [] } },
                hits: { total: 0, max_score: null, hits: [] },
              },
              successes: {
                doc_count: 4,
                lastSuccess: { hits: { total: 4, max_score: null } },
              },
            },
          ],
          doc_count_error_upper_bound: -1,
          sum_other_doc_count: 566,
        },
      },
    } as estypes.SearchResponse<unknown>,
    totalCount: 54,
    edges: [
      {
        node: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          failures: 10,
          successes: 0,
          user: { name: ['Evan Hassanabad'] },
          lastSuccess: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['127.0.0.1'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-1'],
            },
          },
          lastFailure: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['8.8.8.8'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-2'],
            },
          },
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        node: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          failures: 10,
          successes: 0,
          user: { name: ['Braden Hassanabad'] },
          lastSuccess: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['127.0.0.1'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-1'],
            },
          },
          lastFailure: {
            timestamp: '2019-01-23T22:35:32.222Z',
            source: {
              ip: ['8.8.8.8'],
            },
            host: {
              id: ['host-id-1'],
              name: ['host-2'],
            },
          },
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
    ],
    pageInfo: {
      activePage: 1,
      fakeTotalCount: 50,
      showMorePagesIndicator: true,
    },
  },
};
