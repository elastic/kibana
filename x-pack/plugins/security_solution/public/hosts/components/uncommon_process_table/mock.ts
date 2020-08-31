/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UncommonProcessesData } from '../../../graphql/types';

export const mockData: { UncommonProcess: UncommonProcessesData } = {
  UncommonProcess: {
    totalCount: 5,
    edges: [
      {
        node: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          process: {
            title: ['Hello World'],
            name: ['elrond.elstc.co'],
          },
          hosts: [],
          instances: 93,
          user: {
            id: ['0'],
            name: ['root'],
          },
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        node: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          process: {
            title: ['Hello World'],
            name: ['elrond.elstc.co'],
          },
          hosts: [{ id: ['host-id-1'], name: ['hello-world'] }],
          instances: 93,
          user: {
            id: ['0'],
            name: ['root'],
          },
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        node: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          process: {
            title: ['Hello World'],
            name: ['siem-kibana'],
          },
          hosts: [
            { id: ['host-id-1'], name: ['hello-world'] },
            { id: ['host-id-2'], name: ['hello-world-2'] },
          ],
          instances: 97,
          user: {
            id: ['1'],
            name: ['Evan'],
          },
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
      {
        node: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          process: {
            title: ['Hello World'],
            name: ['siem-kibana'],
          },
          hosts: [{ ip: ['127.0.0.1'] }],
          instances: 97,
          user: {
            id: ['1'],
            name: ['Evan'],
          },
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
      {
        node: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          process: {
            title: ['Hello World'],
            name: ['siem-kibana'],
          },
          hosts: [
            { ip: ['127.0.0.1'] },
            { id: ['host-id-1'], name: ['hello-world'] },
            { ip: ['127.0.0.1'] },
            { id: ['host-id-2'], name: ['hello-world-2'] },
            { ip: ['127.0.0.1'] },
          ],
          instances: 97,
          user: {
            id: ['1'],
            name: ['Evan'],
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
