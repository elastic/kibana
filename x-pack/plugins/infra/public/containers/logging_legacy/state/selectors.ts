/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import {
  getSearchResultIndexAfterTime,
  getSearchResultIndexBeforeTime,
  getSearchResultKey,
} from '../../../../common/log_search_result';
import { getLogEntryKey } from '../../../utils/log_entry';
import { globalizeSelectors } from '../../../utils/typed_redux';
import { configurationSelectors as localConfigurationSelectors } from './configuration';
import { entriesSelectors as localEntriesSelectors } from './entries';
import { minimapSelectors as localMinimapSelectors } from './minimap';
import { State } from './reducer';
import { searchSelectors as localSearchSelectors } from './search';
import { searchResultsSelectors as localSearchResultsSelectors } from './search_results';
import { searchSummarySelectors as localSearchSummarySelectors } from './search_summary';
import { sourceSelectors as localSourceSelectors } from './source';
import { summarySelectors as localSummarySelectors } from './summary';
import { targetSelectors as localTargetSelectors } from './target';
import { textviewSelectors as localTextviewSelectors } from './textview';

export const configurationSelectors = globalizeSelectors(
  (state: State) => state.configuration,
  localConfigurationSelectors
);

export const sourceSelectors = globalizeSelectors(
  (state: State) => state.source,
  localSourceSelectors
);

export const targetSelectors = globalizeSelectors(
  (state: State) => state.target,
  localTargetSelectors
);

export const entriesSelectors = globalizeSelectors(
  (state: State) => state.entries,
  localEntriesSelectors
);

export const textviewSelectors = globalizeSelectors(
  (state: State) => state.textview,
  localTextviewSelectors
);

export const summarySelectors = globalizeSelectors(
  (state: State) => state.summary,
  localSummarySelectors
);

export const minimapSelectors = globalizeSelectors(
  (state: State) => state.minimap,
  localMinimapSelectors
);

export const searchSelectors = globalizeSelectors(
  (state: State) => state.search,
  localSearchSelectors
);

export const searchResultsSelectors = globalizeSelectors(
  (state: State) => state.searchResults,
  localSearchResultsSelectors
);

export const searchSummarySelectors = globalizeSelectors(
  (state: State) => state.searchSummary,
  localSearchSummarySelectors
);

export const sharedSelectors = {
  selectNextSearchResultKey: createSelector(
    searchResultsSelectors.selectSearchResults,
    entriesSelectors.selectMiddleVisibleEntry,
    (searchResults, middleVisibleEntry) => {
      if (searchResults.length <= 0 || middleVisibleEntry === null) {
        return null;
      }

      const nextResultIndex = getSearchResultIndexAfterTime(
        searchResults,
        getLogEntryKey(middleVisibleEntry)
      );

      if (nextResultIndex < 0 || nextResultIndex >= searchResults.length) {
        return null;
      }

      return getSearchResultKey(searchResults[nextResultIndex]);
    }
  ),
  selectPreviousSearchResultKey: createSelector(
    searchResultsSelectors.selectSearchResults,
    entriesSelectors.selectMiddleVisibleEntry,
    (searchResults, middleVisibleEntry) => {
      if (searchResults.length <= 0 || middleVisibleEntry === null) {
        return null;
      }

      const nextResultIndex =
        getSearchResultIndexBeforeTime(searchResults, getLogEntryKey(middleVisibleEntry)) - 1;

      if (nextResultIndex < 0 || nextResultIndex >= searchResults.length) {
        return null;
      }

      return getSearchResultKey(searchResults[nextResultIndex]);
    }
  ),
  selectVisibleMidpointOrTargetTime: createSelector(
    entriesSelectors.selectFirstVisibleEntry,
    entriesSelectors.selectLastVisibleEntry,
    targetSelectors.selectTarget,
    (firstVisibleEntry, lastVisibleEntry, target) => {
      if (firstVisibleEntry && lastVisibleEntry) {
        return (firstVisibleEntry.key.time + lastVisibleEntry.key.time) / 2;
      } else if (firstVisibleEntry) {
        return firstVisibleEntry.key.time;
      } else if (lastVisibleEntry) {
        return lastVisibleEntry.key.time;
      } else {
        return target.time;
      }
    }
  ),
};
