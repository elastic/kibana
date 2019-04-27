/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { createSelector } from 'reselect';

import { isFromKueryExpressionValid } from '../../lib/keury';
import { State } from '../reducer';

import { NetworkDetailsModel, NetworkPageModel, NetworkType } from './model';

const selectNetworkPage = (state: State): NetworkPageModel => state.network.page;

const selectNetworkDetails = (state: State): NetworkDetailsModel => state.network.details;

const selectNetworkByType = (state: State, networkType: NetworkType) =>
  get(networkType, state.network);

// Network Page Selectors
export const dnsSelector = () =>
  createSelector(
    selectNetworkPage,
    network => network.queries.dns
  );

export const topNFlowSelector = () =>
  createSelector(
    selectNetworkPage,
    network => network.queries.topNFlow
  );

// Filter Query Selectors
export const networkFilterQueryAsJson = () =>
  createSelector(
    selectNetworkByType,
    network => (network.filterQuery ? network.filterQuery.serializedQuery : null)
  );

export const networkFilterQueryDraft = () =>
  createSelector(
    selectNetworkByType,
    network => network.filterQueryDraft
  );

export const isNetworkFilterQueryDraftValid = () =>
  createSelector(
    selectNetworkByType,
    network => isFromKueryExpressionValid(network.filterQueryDraft)
  );

// IP Details Selectors
export const ipDetailsFlowTargetSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.flowTarget
  );

export const domainsSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.queries.domains
  );

export const tlsSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.queries.tls
  );

export const usersSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.queries.users
  );
