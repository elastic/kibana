/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { HostItem } from '../../../common/graphql/types';
import { ItemsPerRow } from './index';

export const mockData = {
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

export const getHostsColumns = () => [
  {
    name: 'Host',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.name', item)}</>,
  },
  {
    name: 'First seen',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.firstSeen', item)}</>,
  },
  {
    name: 'OS',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.os', item)}</>,
  },
  {
    name: 'Version',
    truncateText: false,
    hideForMobile: false,
    render: (item: HostItem) => <>{getOr('--', 'host.version', item)}</>,
  },
];

export const rowItems: ItemsPerRow[] = [
  {
    text: '2 rows',
    numberOfRow: 2,
  },
  {
    text: '5 rows',
    numberOfRow: 5,
  },
  {
    text: '10 rows',
    numberOfRow: 10,
  },
  {
    text: '20 rows',
    numberOfRow: 20,
  },
  {
    text: '50 rows',
    numberOfRow: 50,
  },
];
