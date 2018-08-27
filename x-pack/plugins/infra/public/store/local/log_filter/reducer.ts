/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { applyLogFilterQuery, setLogFilterQuery } from './actions';

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

export type FilterQuery = KueryFilterQuery;

export interface LogFilterState {
  filterQuery: KueryFilterQuery | null;
}

export const initialLogFilterState: LogFilterState = {
  filterQuery: null,
};

export const logFilterReducer = reducerWithInitialState(initialLogFilterState)
  .cases([applyLogFilterQuery, setLogFilterQuery], (state, filterQuery) => ({
    ...state,
    filterQuery,
  }))
  .build();
