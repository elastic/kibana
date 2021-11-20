/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { get } from 'lodash/fp';
import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopTablesFields,
  NetworkTlsFields,
  NetworkUsersFields,
} from '../../../common/search_strategy';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../common/store/constants';

import {
  setNetworkDetailsTablesActivePageToZero,
  setNetworkTablesActivePageToZero,
  updateNetworkTable,
} from './actions';
import {
  setNetworkDetailsQueriesActivePageToZero,
  setNetworkPageQueriesActivePageToZero,
} from './helpers';
import { NetworkDetailsTableType, NetworkModel, NetworkTableType } from './model';

export type NetworkState = NetworkModel;

export const initialNetworkState: NetworkState = {
  page: {
    queries: {
      [NetworkTableType.topNFlowSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topNFlowDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.dns]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkDnsFields.uniqueDomains,
          direction: Direction.desc,
        },
        isPtrIncluded: false,
      },
      [NetworkTableType.http]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          direction: Direction.desc,
        },
      },
      [NetworkTableType.tls]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTlsFields._id,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topCountriesSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.topCountriesDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [NetworkTableType.alerts]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
  details: {
    queries: {
      [NetworkDetailsTableType.http]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          direction: Direction.desc,
        },
      },
      [NetworkDetailsTableType.topCountriesSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkDetailsTableType.topCountriesDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [NetworkDetailsTableType.topNFlowSource]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_out,
          direction: Direction.desc,
        },
      },
      [NetworkDetailsTableType.topNFlowDestination]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTopTablesFields.bytes_in,
          direction: Direction.desc,
        },
      },
      [NetworkDetailsTableType.tls]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkTlsFields._id,
          direction: Direction.desc,
        },
      },
      [NetworkDetailsTableType.users]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: NetworkUsersFields.name,
          direction: Direction.asc,
        },
      },
    },
    flowTarget: FlowTarget.source,
  },
};

export const networkReducer = reducerWithInitialState(initialNetworkState)
  .case(updateNetworkTable, (state, { networkType, tableType, updates }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        [tableType]: {
          ...get([networkType, 'queries', tableType], state),
          ...updates,
        },
      },
    },
  }))
  .case(setNetworkTablesActivePageToZero, (state) => ({
    ...state,
    page: {
      ...state.page,
      queries: setNetworkPageQueriesActivePageToZero(state),
    },
    details: {
      ...state.details,
      queries: setNetworkDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(setNetworkDetailsTablesActivePageToZero, (state) => ({
    ...state,
    details: {
      ...state.details,
      queries: setNetworkDetailsQueriesActivePageToZero(state),
    },
  }))
  .build();
