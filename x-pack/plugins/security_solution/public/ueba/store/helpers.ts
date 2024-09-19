/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UebaModel, UebaType, UebaTableType, UebaQueries, UebaDetailsQueries } from './model';
import { DEFAULT_TABLE_ACTIVE_PAGE } from '../../common/store/constants';

export const setUebaPageQueriesActivePageToZero = (state: UebaModel): UebaQueries => ({
  ...state.page.queries,
  [UebaTableType.riskScore]: {
    ...state.page.queries[UebaTableType.riskScore],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setUebaDetailsQueriesActivePageToZero = (state: UebaModel): UebaDetailsQueries => ({
  ...state.details.queries,
  [UebaTableType.hostRules]: {
    ...state.details.queries[UebaTableType.hostRules],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [UebaTableType.hostTactics]: {
    ...state.details.queries[UebaTableType.hostTactics],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [UebaTableType.userRules]: {
    ...state.details.queries[UebaTableType.userRules],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setUebaQueriesActivePageToZero = (
  state: UebaModel,
  type: UebaType
): UebaQueries | UebaDetailsQueries => {
  if (type === UebaType.page) {
    return setUebaPageQueriesActivePageToZero(state);
  } else if (type === UebaType.details) {
    return setUebaDetailsQueriesActivePageToZero(state);
  }
  throw new Error(`UebaType ${type} is unknown`);
};
