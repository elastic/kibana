/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  NetworkModel,
  NetworkType,
  NetworkTableType,
  IpDetailsTableType,
  NetworkQueries,
  IpOverviewQueries,
} from './model';
import { DEFAULT_TABLE_ACTIVE_PAGE } from '../constants';

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
): IpOverviewQueries => ({
  ...state.details.queries,
  [IpDetailsTableType.topCountriesSource]: {
    ...state.details.queries[IpDetailsTableType.topCountriesSource],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [IpDetailsTableType.topCountriesDestination]: {
    ...state.details.queries[IpDetailsTableType.topCountriesDestination],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [IpDetailsTableType.topNFlowSource]: {
    ...state.details.queries[IpDetailsTableType.topNFlowSource],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [IpDetailsTableType.topNFlowDestination]: {
    ...state.details.queries[IpDetailsTableType.topNFlowDestination],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [IpDetailsTableType.tls]: {
    ...state.details.queries[IpDetailsTableType.tls],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [IpDetailsTableType.users]: {
    ...state.details.queries[IpDetailsTableType.users],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
  [IpDetailsTableType.http]: {
    ...state.details.queries[IpDetailsTableType.http],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

export const setNetworkQueriesActivePageToZero = (
  state: NetworkModel,
  type: NetworkType
): NetworkQueries | IpOverviewQueries => {
  if (type === NetworkType.page) {
    return setNetworkPageQueriesActivePageToZero(state);
  } else if (type === NetworkType.details) {
    return setNetworkDetailsQueriesActivePageToZero(state);
  }
  throw new Error(`NetworkType ${type} is unknown`);
};
