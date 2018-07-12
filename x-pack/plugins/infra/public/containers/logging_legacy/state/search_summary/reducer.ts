/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { SearchSummaryBucket } from '../../../../../common/log_search_summary';
import { searchActions } from '../search';
import { replaceSearchSummary } from './actions';

export interface SearchSummaryState {
  buckets: SearchSummaryBucket[];
}

export const initialSearchSummaryState: SearchSummaryState = {
  buckets: [],
};

const searchSummaryBucketsReducer = reducerWithInitialState(initialSearchSummaryState.buckets)
  .case(searchActions.clearSearch, state => (state.length > 0 ? [] : state))
  .case(replaceSearchSummary.done, (state, { result: { buckets } }) => buckets);

export const searchSummaryReducer = combineReducers({
  buckets: searchSummaryBucketsReducer,
});
