/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopTablesFields,
  TlsFields,
  UsersFields,
} from '../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../../common/store/constants';
import { NetworkModel, NetworkTableType, IpDetailsTableType, NetworkType } from './model';
import { setNetworkQueriesActivePageToZero } from './helpers';

export const mockNetworkState: NetworkModel = {
  page: {
    queries: {
      [NetworkTableType.topCountriesSource]: {
        activePage: 7,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topCountriesDestination]: {
        activePage: 3,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topNFlowSource]: {
        activePage: 7,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topNFlowDestination]: {
        activePage: 3,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.dns]: {
        activePage: 5,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkDnsFields.uniqueDomains,
          direction: Direction.desc,
        },
        isPtrIncluded: false,
      },
      [NetworkTableType.tls]: {
        activePage: 2,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.http]: {
        activePage: 0,
        limit: DEFAULT_TABLE_LIMIT,
        sort: { direction: Direction.desc },
      },
      [NetworkTableType.alerts]: {
        activePage: 0,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
  details: {
    queries: {
      [IpDetailsTableType.topCountriesSource]: {
        activePage: 7,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topCountriesDestination]: {
        activePage: 3,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topNFlowSource]: {
        activePage: 7,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.topNFlowDestination]: {
        activePage: 3,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.tls]: {
        activePage: 2,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: TlsFields._id,
          direction: Direction.desc,
        },
      },
      [IpDetailsTableType.users]: {
        activePage: 6,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: UsersFields.name,
          direction: Direction.asc,
        },
      },
      [IpDetailsTableType.http]: {
        activePage: 0,
        limit: DEFAULT_TABLE_LIMIT,
        sort: { direction: Direction.desc },
      },
    },
    flowTarget: FlowTarget.source,
  },
};

describe('Network redux store', () => {
  describe('#setNetworkQueriesActivePageToZero', () => {
    test('set activePage to zero for all queries in network page', () => {
      expect(setNetworkQueriesActivePageToZero(mockNetworkState, NetworkType.page)).toEqual({
        [NetworkTableType.topNFlowSource]: {
          activePage: 0,
          limit: 10,
          sort: { field: 'bytes_out', direction: 'desc' },
        },
        [NetworkTableType.topNFlowDestination]: {
          activePage: 0,
          limit: 10,
          sort: { field: 'bytes_out', direction: 'desc' },
        },
        [NetworkTableType.dns]: {
          activePage: 0,
          limit: 10,
          sort: { field: 'uniqueDomains', direction: 'desc' },
          isPtrIncluded: false,
        },
        [NetworkTableType.http]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
          },
        },
        [NetworkTableType.tls]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: '_id',
          },
        },
        [NetworkTableType.topCountriesDestination]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: 'bytes_out',
          },
        },
        [NetworkTableType.topCountriesSource]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: 'bytes_out',
          },
        },
        [NetworkTableType.alerts]: {
          activePage: 0,
          limit: 10,
        },
      });
    });

    test('set activePage to zero for all queries in ip details  ', () => {
      expect(setNetworkQueriesActivePageToZero(mockNetworkState, NetworkType.details)).toEqual({
        [IpDetailsTableType.topNFlowSource]: {
          activePage: 0,
          limit: 10,
          sort: { field: 'bytes_out', direction: 'desc' },
        },
        [IpDetailsTableType.topNFlowDestination]: {
          activePage: 0,
          limit: 10,
          sort: { field: 'bytes_out', direction: 'desc' },
        },
        [IpDetailsTableType.topCountriesDestination]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: 'bytes_out',
          },
        },
        [IpDetailsTableType.topCountriesSource]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
            field: 'bytes_out',
          },
        },
        [IpDetailsTableType.http]: {
          activePage: 0,
          limit: 10,
          sort: {
            direction: 'desc',
          },
        },
        [IpDetailsTableType.tls]: {
          activePage: 0,
          limit: 10,
          sort: { field: '_id', direction: 'desc' },
        },
        [IpDetailsTableType.users]: {
          activePage: 0,
          limit: 10,
          sort: { field: 'name', direction: 'asc' },
        },
      });
    });
  });
});
