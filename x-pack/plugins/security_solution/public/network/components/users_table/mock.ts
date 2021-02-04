/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NetworkUsersStrategyResponse } from '../../../../common/search_strategy';

export const mockUsersData: NetworkUsersStrategyResponse = {
  edges: [
    {
      node: {
        _id: '_apt',
        user: {
          id: ['104'],
          name: '_apt',
          groupId: ['65534'],
          groupName: ['nogroup'],
          count: 10,
        },
      },
      cursor: {
        value: '_apt',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'root',
        user: {
          id: ['0'],
          name: 'root',
          groupId: ['116', '0'],
          groupName: ['Debian-exim', 'root'],
          count: 108,
        },
      },
      cursor: {
        value: 'root',
        tiebreaker: null,
      },
    },
    {
      node: {
        _id: 'systemd-resolve',
        user: {
          id: ['102'],
          name: 'systemd-resolve',
          groupId: [],
          groupName: [],
          count: 4,
        },
      },
      cursor: {
        value: 'systemd-resolve',
        tiebreaker: null,
      },
    },
  ],
  totalCount: 3,
  pageInfo: {
    activePage: 1,
    fakeTotalCount: 3,
    showMorePagesIndicator: true,
  },
  rawResponse: {} as NetworkUsersStrategyResponse['rawResponse'],
};
