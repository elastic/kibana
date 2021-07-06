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
  setUebaDetailsTablesActivePageToZero,
  setUebaTablesActivePageToZero,
  updateUebaTable,
  updateTableActivePage,
  updateTableLimit,
} from './actions';
import {
  setUebaDetailsQueriesActivePageToZero,
  setUebaPageQueriesActivePageToZero,
} from './helpers';
import { UebaDetailsTableType, UebaModel, UebaTableType } from './model';

export const initialUebaState: UebaModel = {
  page: {
    queries: {
      [UebaTableType.riskScore]: {
        activePage: DEFAULT_TABLE_ACTIVE_PAGE,
        limit: DEFAULT_TABLE_LIMIT,
        sort: {
          field: RiskScoreFields.riskScore,
          direction: Direction.desc,
        },
      },
    },
  },
  details: {
    queries: {
      [UebaDetailsTableType.riskScore]: {
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

export const uebaReducer = reducerWithInitialState(initialUebaState)
  .case(updateUebaTable, (state, { uebaType, tableType, updates }) => ({
    ...state,
    [uebaType]: {
      ...state[uebaType],
      queries: {
        ...state[uebaType].queries,
        [tableType]: {
          ...get([uebaType, 'queries', tableType], state),
          ...updates,
        },
      },
    },
  }))
  .case(setUebaTablesActivePageToZero, (state) => ({
    ...state,
    page: {
      ...state.page,
      queries: setUebaPageQueriesActivePageToZero(state),
    },
    details: {
      ...state.details,
      queries: setUebaDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(setUebaDetailsTablesActivePageToZero, (state) => ({
    ...state,
    details: {
      ...state.details,
      queries: setUebaDetailsQueriesActivePageToZero(state),
    },
  }))
  .case(updateTableActivePage, (state, { activePage, uebaType, tableType }) => ({
    ...state,
    [uebaType]: {
      ...state[uebaType],
      queries: {
        ...state[uebaType].queries,
        [tableType]: {
          ...state[uebaType].queries[tableType],
          activePage,
        },
      },
    },
  }))
  .case(updateTableLimit, (state, { limit, uebaType, tableType }) => ({
    ...state,
    [uebaType]: {
      ...state[uebaType],
      queries: {
        ...state[uebaType].queries,
        [tableType]: {
          ...state[uebaType].queries[tableType],
          limit,
        },
      },
    },
  }))
  .build();
