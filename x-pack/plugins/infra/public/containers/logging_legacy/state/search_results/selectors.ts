/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import keyBy from 'lodash/fp/keyBy';
import { createSelector } from 'reselect';

import { isRunningLoadingProgress } from '../../../../utils/loading_state';
import { SearchResultsState } from './reducer';

export const selectSearchResults = (state: SearchResultsState) => state.results;

export const selectSearchResultsById = createSelector(
  selectSearchResults,
  searchResults => keyBy('gid', searchResults)
);

export const selectFirstSearchResult = createSelector(
  selectSearchResults,
  searchResults => (searchResults.length > 0 ? searchResults[0] : null)
);

export const selectLastSearchResult = createSelector(
  selectSearchResults,
  searchResults =>
    searchResults.length > 0 ? searchResults[searchResults.length - 1] : null
);

export const selectIsLoadingSearchResults = createSelector(
  (state: SearchResultsState) => state.start,
  (state: SearchResultsState) => state.end,
  (startLoadingState, endLoadingState) =>
    isRunningLoadingProgress(startLoadingState.current) ||
    isRunningLoadingProgress(endLoadingState.current)
);
