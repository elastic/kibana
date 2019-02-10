/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  applyNetworkFilterQuery,
  setNetworkFilterQueryDraft,
  updateTopDestinationLimit,
  updateTopSourceLimit,
} from './actions';
import { NetworkModel } from './model';

export type NetworkState = NetworkModel;

export const DEFAULT_LIMIT = 10;

export const initialNetworkState: NetworkState = {
  page: {
    queries: {
      topSource: {
        limit: DEFAULT_LIMIT,
      },
      topDestination: {
        limit: DEFAULT_LIMIT,
      },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
  details: {
    queries: null,
    filterQuery: null,
    filterQueryDraft: null,
  },
};

export const networkReducer = reducerWithInitialState(initialNetworkState)
  .case(updateTopSourceLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topSource: {
          limit,
        },
      },
    },
  }))
  .case(updateTopDestinationLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topDestination: {
          limit,
        },
      },
    },
  }))
  .case(setNetworkFilterQueryDraft, (state, { filterQueryDraft, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      filterQueryDraft,
    },
  }))
  .case(applyNetworkFilterQuery, (state, { filterQuery, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      filterQueryDraft: filterQuery.query,
      filterQuery,
    },
  }))
  .build();
