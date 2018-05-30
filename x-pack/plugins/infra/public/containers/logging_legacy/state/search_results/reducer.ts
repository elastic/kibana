/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  getSearchResultIndexAfterTime,
  getSearchResultIndexBeforeTime,
  getSearchResultKey,
  SearchResult,
} from '../../../../../common/log_search_result';
import {
  createFailureResultReducer,
  createIdleProgressReducer,
  createRunningProgressReducer,
  createSuccessResultReducer,
  initialLoadingState,
  LoadingState,
} from '../../../../utils/loading_state';
import { searchActions } from '../search';
import {
  replaceNewerSearchResults,
  replaceOlderSearchResults,
  replaceSearchResults,
} from './actions';

export interface SearchResultsState {
  start: LoadingState<{}>;
  end: LoadingState<{}>;
  results: SearchResult[];
}

export const initialSearchResultsState: SearchResultsState = {
  end: initialLoadingState,
  results: [],
  start: initialLoadingState,
};

const searchResultsStartCurrentProgressReducer = reducerWithInitialState(
  initialSearchResultsState.start.current
)
  .cases(
    [replaceSearchResults.started, replaceOlderSearchResults.started],
    createRunningProgressReducer()
  )
  .cases(
    [
      replaceSearchResults.done,
      replaceSearchResults.failed,
      replaceOlderSearchResults.done,
      replaceOlderSearchResults.failed,
    ],
    createIdleProgressReducer()
  );

const searchResultsStartLastResultReducer = reducerWithInitialState(
  initialSearchResultsState.start.last
)
  .case(replaceSearchResults.done, createSuccessResultReducer(() => false))
  .case(replaceOlderSearchResults.done, createSuccessResultReducer(() => false))
  .cases(
    [replaceSearchResults.failed, replaceOlderSearchResults.failed],
    createFailureResultReducer()
  );

const searchResultsStartPolicyReducer = reducerWithInitialState(
  initialSearchResultsState.start.policy
);

const searchResultsStartReducer = combineReducers<SearchResultsState['start']>({
  current: searchResultsStartCurrentProgressReducer,
  last: searchResultsStartLastResultReducer,
  policy: searchResultsStartPolicyReducer,
});

const searchResultsEndCurrentProgressReducer = reducerWithInitialState(
  initialSearchResultsState.end.current
)
  .cases(
    [replaceSearchResults.started, replaceNewerSearchResults.started],
    createRunningProgressReducer()
  )
  .cases(
    [
      replaceSearchResults.done,
      replaceSearchResults.failed,
      replaceNewerSearchResults.done,
      replaceNewerSearchResults.failed,
    ],
    createIdleProgressReducer()
  );

const searchResultsEndLastResultReducer = reducerWithInitialState(
  initialSearchResultsState.end.last
)
  .cases(
    [replaceSearchResults.done, replaceNewerSearchResults.done],
    createSuccessResultReducer(() => false)
  )
  .cases(
    [replaceSearchResults.failed, replaceNewerSearchResults.failed],
    createFailureResultReducer()
  );

const searchResultsEndPolicyReducer = reducerWithInitialState(
  initialSearchResultsState.end.policy
);

const searchResultsEndReducer = combineReducers<SearchResultsState['end']>({
  current: searchResultsEndCurrentProgressReducer,
  last: searchResultsEndLastResultReducer,
  policy: searchResultsEndPolicyReducer,
});

const searchResultsResultsReducer = reducerWithInitialState(
  initialSearchResultsState.results
)
  .case(searchActions.clearSearch, state => (state.length > 0 ? [] : state))
  .case(replaceSearchResults.done, (state, { result: { results } }) => results)
  .case(replaceOlderSearchResults.done, (state, { result: { results } }) => {
    if (results.length > 0) {
      const lastResultKey = getSearchResultKey(results[results.length - 1]);
      const beforeIndex = getSearchResultIndexAfterTime(state, lastResultKey);
      const newerResults = state.slice(beforeIndex);
      return [...results, ...newerResults];
    } else {
      return state;
    }
  })
  .case(replaceNewerSearchResults.done, (state, { result: { results } }) => {
    if (results.length > 0) {
      const firstResultKey = getSearchResultKey(results[0]);
      const beforeIndex = getSearchResultIndexBeforeTime(state, firstResultKey);
      const olderResults = state.slice(0, beforeIndex);
      return [...olderResults, ...results];
    } else {
      return state;
    }
  });

export const searchResultsReducer = combineReducers({
  end: searchResultsEndReducer,
  results: searchResultsResultsReducer,
  start: searchResultsStartReducer,
});
