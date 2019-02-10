/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { get } from 'lodash/fp';
import { createSelector } from 'reselect';

import { State } from '../../reducer';
import { GenericNetworkModel, NetworkType } from './model';

const selectNetwork = (state: State, networkType: NetworkType): GenericNetworkModel =>
  get(networkType, state.local.network);

export const topSourceSelector = () =>
  createSelector(
    selectNetwork,
    network => network.queries!.topSource
  );

export const topDestinationSelector = () =>
  createSelector(
    selectNetwork,
    network => network.queries!.topDestination
  );

export const networkFilterQueryExpression = () =>
  createSelector(
    selectNetwork,
    network => (network.filterQuery! ? network.filterQuery!.query.expression : null)
  );

export const networkFilterQueryAsJson = () =>
  createSelector(
    selectNetwork,
    network => (network.filterQuery ? network.filterQuery.serializedQuery : null)
  );

export const networkFilterQueryDraft = () =>
  createSelector(
    selectNetwork,
    network => network.filterQueryDraft
  );

export const isNetworkFilterQueryDraftValid = () =>
  createSelector(
    selectNetwork,
    network => {
      if (network.filterQueryDraft && network.filterQueryDraft.kind === 'kuery') {
        try {
          fromKueryExpression(network.filterQueryDraft.expression);
        } catch (err) {
          return false;
        }
      }
      return true;
    }
  );
