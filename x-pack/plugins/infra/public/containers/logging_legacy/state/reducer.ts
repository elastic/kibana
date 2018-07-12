/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import {
  configurationReducer,
  ConfigurationState,
  initialConfigurationState,
} from './configuration';
import { entriesReducer, EntriesState, initialEntriesState } from './entries';
import { initialMinimapState, minimapReducer, MinimapState } from './minimap';
import { initialSearchState, searchReducer, SearchState } from './search';
import {
  initialSearchResultsState,
  searchResultsReducer,
  SearchResultsState,
} from './search_results';
import {
  initialSearchSummaryState,
  searchSummaryReducer,
  SearchSummaryState,
} from './search_summary';
import { initialSourceState, sourceReducer, SourceState } from './source';
import { initialSummaryState, summaryReducer, SummaryState } from './summary';
import { initialTargetState, targetReducer, TargetState } from './target';
import { initialTextviewState, textviewReducer, TextviewState } from './textview';

export interface State {
  configuration: ConfigurationState;
  source: SourceState;
  target: TargetState;
  entries: EntriesState;
  textview: TextviewState;
  summary: SummaryState;
  minimap: MinimapState;
  search: SearchState;
  searchResults: SearchResultsState;
  searchSummary: SearchSummaryState;
}

export const initialState: State = {
  configuration: initialConfigurationState,
  entries: initialEntriesState,
  minimap: initialMinimapState,
  search: initialSearchState,
  searchResults: initialSearchResultsState,
  searchSummary: initialSearchSummaryState,
  source: initialSourceState,
  summary: initialSummaryState,
  target: initialTargetState,
  textview: initialTextviewState,
};

export const reducer = combineReducers<State>({
  configuration: configurationReducer,
  entries: entriesReducer,
  minimap: minimapReducer,
  search: searchReducer,
  searchResults: searchResultsReducer,
  searchSummary: searchSummaryReducer,
  source: sourceReducer,
  summary: summaryReducer,
  target: targetReducer,
  textview: textviewReducer,
});
