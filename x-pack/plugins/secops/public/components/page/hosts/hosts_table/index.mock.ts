/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsData } from '../../../../../common/graphql/types';

export const mockData: { Hosts: HostsData } = {
  Hosts: {
    totalCount: 4,
    edges: [
      {
        host: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          name: 'elrond.elstc.co',
          os: 'Ubuntu',
          version: '18.04.1 LTS (Bionic Beaver)',
          firstSeen: '2018-12-06T15:40:53.319Z',
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        host: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          name: 'siem-kibana',
          os: 'Debian GNU/Linux',
          version: '9 (stretch)',
          firstSeen: '2018-12-07T14:12:38.560Z',
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
