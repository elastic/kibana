/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NetworkModel,
  NetworkType,
  NetworkTableType,
  NetworkDetailsTableType,
  NetworkQueries,
  NetworkDetailsQueries,
} from './model';
import { DEFAULT_TABLE_ACTIVE_PAGE } from '../../common/store/constants';

export const setNetworkPageQueriesActivePageToZero = (state: NetworkModel): NetworkQueries => ({
  ...state.page.queries,
  [NetworkTableType.topCountriesSource]: {
    ...state.page.queries[NetworkTableType.topCountriesSource],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkTableType.topCountriesDestination]: {
    ...state.page.queries[NetworkTableType.topCountriesDestination],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkTableType.topNFlowSource]: {
    ...state.page.queries[NetworkTableType.topNFlowSource],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkTableType.topNFlowDestination]: {
    ...state.page.queries[NetworkTableType.topNFlowDestination],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkTableType.dns]: {
    ...state.page.queries[NetworkTableType.dns],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkTableType.tls]: {
    ...state.page.queries[NetworkTableType.tls],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkTableType.http]: {
    ...state.page.queries[NetworkTableType.http],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setNetworkDetailsQueriesActivePageToZero = (
  state: NetworkModel
): NetworkDetailsQueries => ({
  ...state.details.queries,
  [NetworkDetailsTableType.topCountriesSource]: {
    ...state.details.queries[NetworkDetailsTableType.topCountriesSource],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkDetailsTableType.topCountriesDestination]: {
    ...state.details.queries[NetworkDetailsTableType.topCountriesDestination],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkDetailsTableType.topNFlowSource]: {
    ...state.details.queries[NetworkDetailsTableType.topNFlowSource],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkDetailsTableType.topNFlowDestination]: {
    ...state.details.queries[NetworkDetailsTableType.topNFlowDestination],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkDetailsTableType.tls]: {
    ...state.details.queries[NetworkDetailsTableType.tls],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkDetailsTableType.users]: {
    ...state.details.queries[NetworkDetailsTableType.users],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [NetworkDetailsTableType.http]: {
    ...state.details.queries[NetworkDetailsTableType.http],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setNetworkQueriesActivePageToZero = (
  state: NetworkModel,
  type: NetworkType
): NetworkQueries | NetworkDetailsQueries => {
  if (type === NetworkType.page) {
    return setNetworkPageQueriesActivePageToZero(state);
  } else if (type === NetworkType.details) {
    return setNetworkDetailsQueriesActivePageToZero(state);
  }
  throw new Error(`NetworkType ${type} is unknown`);
};
