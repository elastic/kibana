/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UncommonProcessesData } from '../../../../graphql/types';

export const mockData: { UncommonProcess: UncommonProcessesData } = {
  UncommonProcess: {
    totalCount: 4,
    edges: [
      {
        uncommonProcess: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          name: 'elrond.elstc.co',
          hosts: ['Hello World', 'Hello World'],
          instances: 93,
          title: 'Hello World',
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        uncommonProcess: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          name: 'siem-kibana',
          hosts: ['Hello World', 'Hello World'],
          instances: 97,
          title: 'Hello World',
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
