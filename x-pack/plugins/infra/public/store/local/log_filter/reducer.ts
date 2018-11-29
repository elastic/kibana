/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { applyLogFilterQuery, setLogFilterQueryDraft } from './actions';

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

export type FilterQuery = KueryFilterQuery;

export interface LogFilterState {
  filterQuery: KueryFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
}

export const initialLogFilterState: LogFilterState = {
  filterQuery: null,
  filterQueryDraft: null,
};

export const logFilterReducer = reducerWithInitialState(initialLogFilterState)
  .case(setLogFilterQueryDraft, (state, filterQueryDraft) => ({
    ...state,
    filterQueryDraft,
  }))
  .case(applyLogFilterQuery, (state, filterQuery) => ({
    ...state,
    filterQuery,
    filterQueryDraft: filterQuery,
  }))
  .build();
