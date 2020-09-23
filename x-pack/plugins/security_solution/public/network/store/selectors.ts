/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { get } from 'lodash/fp';

import { FlowTargetSourceDest } from '../../../common/search_strategy/security_solution/network';
import { State } from '../../common/store/types';
import { initialNetworkState } from './reducer';
import {
  NetworkDetailsTableType,
  NetworkDetailsModel,
  NetworkPageModel,
  NetworkTableType,
  NetworkType,
  TopCountriesQuery,
  TlsQuery,
  HttpQuery,
} from './model';

const selectNetworkPage = (state: State): NetworkPageModel => state.network.page;

const selectNetworkDetails = (state: State): NetworkDetailsModel => state.network.details;

// Network Page Selectors
export const dnsSelector = () =>
  createSelector(selectNetworkPage, (network) => network.queries.dns);

const selectTopNFlowByType = (
  state: State,
  networkType: NetworkType,
  flowTarget: FlowTargetSourceDest
) => {
  const ft = flowTarget === FlowTargetSourceDest.source ? 'topNFlowSource' : 'topNFlowDestination';
  const nFlowType =
    networkType === NetworkType.page ? NetworkTableType[ft] : NetworkDetailsTableType[ft];
  return (
    get([networkType, 'queries', nFlowType], state.network) ||
    get([networkType, 'queries', nFlowType], initialNetworkState)
  );
};

export const topNFlowSelector = () =>
  createSelector(selectTopNFlowByType, (topNFlowQueries) => topNFlowQueries);
const selectTlsByType = (state: State, networkType: NetworkType): TlsQuery => {
  const tlsType =
    networkType === NetworkType.page ? NetworkTableType.tls : NetworkDetailsTableType.tls;
  return (
    get([networkType, 'queries', tlsType], state.network) ||
    get([networkType, 'queries', tlsType], initialNetworkState)
  );
};

export const tlsSelector = () => createSelector(selectTlsByType, (tlsQueries) => tlsQueries);

const selectTopCountriesByType = (
  state: State,
  networkType: NetworkType,
  flowTarget: FlowTargetSourceDest
): TopCountriesQuery => {
  const ft =
    flowTarget === FlowTargetSourceDest.source ? 'topCountriesSource' : 'topCountriesDestination';
  const nFlowType =
    networkType === NetworkType.page ? NetworkTableType[ft] : NetworkDetailsTableType[ft];

  return (
    get([networkType, 'queries', nFlowType], state.network) ||
    get([networkType, 'queries', nFlowType], initialNetworkState)
  );
};

export const topCountriesSelector = () =>
  createSelector(selectTopCountriesByType, (topCountriesQueries) => topCountriesQueries);

const selectHttpByType = (state: State, networkType: NetworkType): HttpQuery => {
  const httpType =
    networkType === NetworkType.page ? NetworkTableType.http : NetworkDetailsTableType.http;
  return (
    get([networkType, 'queries', httpType], state.network) ||
    get([networkType, 'queries', httpType], initialNetworkState)
  );
};

export const httpSelector = () => createSelector(selectHttpByType, (httpQueries) => httpQueries);

export const usersSelector = () =>
  createSelector(selectNetworkDetails, (network) => network.queries.users);
