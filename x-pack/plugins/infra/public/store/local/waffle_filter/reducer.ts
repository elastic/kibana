/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { applyWaffleFilterQuery, setWaffleFilterQueryDraft } from './actions';

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

export type FilterQuery = KueryFilterQuery;

export interface SerializedFilterQuery {
  query: FilterQuery | null;
  serializedQuery: string | null;
}

export interface WaffleFilterState {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
}

export const initialWaffleFilterState: WaffleFilterState = {
  filterQuery: null,
  filterQueryDraft: null,
};

export const waffleFilterReducer = reducerWithInitialState(initialWaffleFilterState)
  .case(setWaffleFilterQueryDraft, (state, filterQueryDraft) => ({
    ...state,
    filterQueryDraft,
  }))
  .case(applyWaffleFilterQuery, (state, filterQuery) => ({
    ...state,
    filterQuery,
    filterQueryDraft: filterQuery.query,
  }))
  .build();
