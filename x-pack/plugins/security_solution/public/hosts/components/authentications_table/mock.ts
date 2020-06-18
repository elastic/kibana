/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticationsData } from '../../../graphql/types';

export const mockData: { Authentications: AuthenticationsData } = {
  Authentications: {
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
