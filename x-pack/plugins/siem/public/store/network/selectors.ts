/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { isFromKueryExpressionValid } from '../../lib/keury';
import { State } from '../reducer';

import { NetworkDetailsModel, NetworkPageModel } from './model';

const selectNetworkPage = (state: State): NetworkPageModel => state.network.page;

const selectNetworkDetails = (state: State): NetworkDetailsModel => state.network.details;

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

export const networkFilterQueryExpression = () =>
  createSelector(
    selectNetworkPage,
    network => (network.filterQuery ? network.filterQuery.query.expression : null)
  );

export const networkFilterQueryAsJson = () =>
  createSelector(
    selectNetworkPage,
    network => (network.filterQuery ? network.filterQuery.serializedQuery : null)
  );

export const networkFilterQueryDraft = () =>
  createSelector(
    selectNetworkPage,
    network => network.filterQueryDraft
  );

export const isNetworkFilterQueryDraftValid = () =>
  createSelector(
    selectNetworkPage,
    network => isFromKueryExpressionValid(network.filterQueryDraft)
  );

// IP Details Selectors
export const ipOverviewSelector = () =>
  createSelector(
    selectNetworkDetails,
    network => network.queries.ipOverview
  );
