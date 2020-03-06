/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { Direction, HostsFields } from '../../graphql/types';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../constants';

import {
  setHostDetailsTablesActivePageToZero,
  setHostTablesActivePageToZero,
  updateHostsSort,
  updateTableActivePage,
  updateTableLimit,
} from './actions';
import {
  setHostPageQueriesActivePageToZero,
  setHostDetailsQueriesActivePageToZero,
} from './helpers';
import { HostsModel, HostsTableType } from './model';

export type HostsState = HostsModel;

export const initialHostsState: HostsState = {
  page: {
    queries: {
      [HostsTableType.authentications]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.hosts]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        direction: Direction.desc,
        limit: DEFAULT_TABLE_LIMIT,
        sortField: HostsFields.lastSeen,
      },
      [HostsTableType.events]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.uncommonProcesses]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.anomalies]: null,
      [HostsTableType.alerts]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
  details: {
    queries: {
      [HostsTableType.authentications]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.hosts]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        direction: Direction.desc,
        limit: DEFAULT_TABLE_LIMIT,
        sortField: HostsFields.lastSeen,
      },
      [HostsTableType.events]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.uncommonProcesses]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
      [HostsTableType.anomalies]: null,
      [HostsTableType.alerts]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
      },
    },
  },
};

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(setHostTablesActivePageToZero, state => ({
    ...state,
    page: {
      ...state.page,
      queries: setHostPageQueriesActivePageToZero(state),
    },
    details: {
      ...state.details,
      queries: setHostDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(setHostDetailsTablesActivePageToZero, state => ({
    ...state,
    details: {
      ...state.details,
      queries: setHostDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(updateTableActivePage, (state, { activePage, hostsType, tableType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        [tableType]: {
          ...state[hostsType].queries[tableType],
          activePage,
        },
      },
    },
  }))
  .case(updateTableLimit, (state, { limit, hostsType, tableType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        [tableType]: {
          ...state[hostsType].queries[tableType],
          limit,
        },
      },
    },
  }))
  .case(updateHostsSort, (state, { sort, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        [HostsTableType.hosts]: {
          ...state[hostsType].queries[HostsTableType.hosts],
          direction: sort.direction,
          sortField: sort.field,
        },
      },
    },
  }))
  .build();
