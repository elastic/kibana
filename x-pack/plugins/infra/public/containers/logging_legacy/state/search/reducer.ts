/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { clearSearch, search } from './actions';

export interface SearchState {
  query: string | null;
}

export const initialSearchState: SearchState = {
  query: null,
};

const searchQueryReducer = reducerWithInitialState(initialSearchState.query)
  .case(search, (state, query) => query)
  .case(clearSearch, () => null);

export const searchReducer = combineReducers({
  query: searchQueryReducer,
});
