/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reduceReducers from 'reduce-reducers';
import { combineReducers, Reducer } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  reportVisibleEntries,
  // startLiveStreaming,
  // stopLiveStreaming,
} from './actions';
import { loadMoreEntriesReducer } from './load_more_operation';
import { loadEntriesReducer } from './load_operation';
import { EntriesGraphqlState, EntriesState, initialEntriesState } from './state';

const entriesEntriesReducer = reduceReducers(loadEntriesReducer, loadMoreEntriesReducer) as Reducer<
  EntriesGraphqlState
>;

const entriesVisibleReducer = reducerWithInitialState(initialEntriesState.visible).case(
  reportVisibleEntries,
  (state, { startKey, middleKey, endKey }) => ({
    endKey,
    middleKey,
    startKey,
  })
);

export const entriesReducer = combineReducers<EntriesState>({
  entries: entriesEntriesReducer,
  visible: entriesVisibleReducer,
});
