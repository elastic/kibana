/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthorizationsData } from '../../../../graphql/types';

export const mockData: { Authorizations: AuthorizationsData } = {
  Authorizations: {
    totalCount: 4,
    edges: [
      {
        authorization: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          failures: 10,
          successes: 0,
          user: 'Evan Hassanabad',
          from: '127.0.0.1',
          latest: '2019-01-11T06:18:30.745Z',
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        authorization: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          failures: 10,
          successes: 0,
          user: 'Braden Hassanabad',
          from: '127.0.0.1',
          latest: '2019-01-11T06:18:30.745Z',
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
    ],
    pageInfo: {
      endCursor: {
        value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
      },
      hasNextPage: true,
    },
  },
};
