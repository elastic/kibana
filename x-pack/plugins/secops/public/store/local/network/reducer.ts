/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { NetworkTopNFlowDirection, NetworkTopNFlowType } from '../../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../constants';
import {
  applyNetworkFilterQuery,
  setNetworkFilterQueryDraft,
  updateTopNFlowDirection,
  updateTopNFlowLimit,
  updateTopNFlowType,
} from './actions';
import { helperUpdateTopNFlowDirection } from './helper';
import { NetworkModel } from './model';

export type NetworkState = NetworkModel;

export const initialNetworkState: NetworkState = {
  page: {
    queries: {
      topNFlow: {
        limit: DEFAULT_TABLE_LIMIT,
        topNFlowType: NetworkTopNFlowType.source,
        topNFlowDirection: NetworkTopNFlowDirection.uniDirectional,
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
  .case(updateTopNFlowLimit, (state, { limit, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[networkType].queries!.topNFlow,
          limit,
        },
      },
    },
  }))
  .case(updateTopNFlowDirection, (state, { topNFlowDirection, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[networkType].queries!.topNFlow,
          ...helperUpdateTopNFlowDirection(
            state[networkType].queries!.topNFlow.topNFlowType,
            topNFlowDirection
          ),
        },
      },
    },
  }))
  .case(updateTopNFlowType, (state, { topNFlowType, networkType }) => ({
    ...state,
    [networkType]: {
      ...state[networkType],
      queries: {
        ...state[networkType].queries,
        topNFlow: {
          ...state[networkType].queries!.topNFlow,
          topNFlowType,
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
