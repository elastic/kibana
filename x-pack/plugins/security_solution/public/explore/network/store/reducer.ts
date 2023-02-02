/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { get, set } from 'lodash/fp';
import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopTablesFields,
  NetworkTlsFields,
  NetworkUsersFields,
} from '../../../../common/search_strategy';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../../common/store/constants';

import {
  setNetworkDetailsTablesActivePageToZero,
  setNetworkTablesActivePageToZero,
  updateNetworkTable,
  updateNetworkAnomaliesJobIdFilter,
  updateNetworkAnomaliesInterval,
} from './actions';
import {
  setNetworkDetailsQueriesActivePageToZero,
  setNetworkPageQueriesActivePageToZero,
} from './helpers';
import type { NetworkModel } from './model';
import { NetworkType, NetworkDetailsTableType, NetworkTableType } from './model';

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
      [NetworkTableType.anomalies]: {
        jobIdSelection: [],
        intervalSelection: 'auto',
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
      [NetworkDetailsTableType.anomalies]: {
        jobIdSelection: [],
        intervalSelection: 'auto',
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
  .case(updateNetworkAnomaliesJobIdFilter, (state, { jobIds, networkType }) => {
    if (networkType === NetworkType.page) {
      return set('page.queries.anomalies.jobIdSelection', jobIds, state);
    } else {
      return set('details.queries.anomalies.jobIdSelection', jobIds, state);
    }
  })
  .case(updateNetworkAnomaliesInterval, (state, { interval, networkType }) => {
    if (networkType === NetworkType.page) {
      return set('page.queries.anomalies.intervalSelection', interval, state);
    } else {
      return set('details.queries.anomalies.intervalSelection', interval, state);
    }
  })
  .build();
