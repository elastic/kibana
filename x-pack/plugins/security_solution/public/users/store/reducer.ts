/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { get } from 'lodash/fp';
import { Direction, RiskScoreFields } from '../../../common/search_strategy';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../common/store/constants';

import {
  setUsersTablesActivePageToZero,
  updateUsersTable,
  updateTableActivePage,
  updateTableLimit,
} from './actions';
import { setUsersPageQueriesActivePageToZero } from './helpers';
import { UsersTableType, UsersModel } from './model';

export const initialUsersState: UsersModel = {
  page: {
    queries: {
      [UsersTableType.riskScore]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: RiskScoreFields.riskScore,
          direction: Direction.desc,
        },
      },
    },
  },
};

export const usersReducer = reducerWithInitialState(initialUsersState)
  .case(updateUsersTable, (state, { usersType, tableType, updates }) => ({
    ...state,
    [usersType]: {
      ...state[usersType],
      queries: {
        ...state[usersType].queries,
        [tableType]: {
          ...get([usersType, 'queries', tableType], state),
          ...updates,
        },
      },
    },
  }))
  .case(setUsersTablesActivePageToZero, (state) => ({
    ...state,
    page: {
      ...state.page,
      queries: setUsersPageQueriesActivePageToZero(state),
    },
  }))
  .case(updateTableActivePage, (state, { activePage, usersType, tableType }) => ({
    ...state,
    [usersType]: {
      ...state[usersType],
      queries: {
        ...state[usersType].queries,
        [tableType]: {
          // TODO: Steph/ueba fix active page/limit on ueba tables. is broken because multiple UsersTableType.userRules tables
          // @ts-expect-error TS7053
          ...state[usersType].queries[tableType],
          activePage,
        },
      },
    },
  }))
  .case(updateTableLimit, (state, { limit, usersType, tableType }) => ({
    ...state,
    [usersType]: {
      ...state[usersType],
      queries: {
        ...state[usersType].queries,
        [tableType]: {
          // TODO: Steph/ueba fix active page/limit on ueba tables. is broken because multiple UsersTableType.userRules tables
          // @ts-expect-error TS7053
          ...state[usersType].queries[tableType],
          limit,
        },
      },
    },
  }))
  .build();
