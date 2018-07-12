/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { LogEntry } from '../../../common/log_entry';
import { SearchResult } from '../../../common/log_search_result';
import { bindPlainActionCreators } from '../../utils/typed_redux';

import {
  entriesActions,
  entriesSelectors,
  searchResultsSelectors,
  State,
  targetActions,
  targetSelectors,
  textviewSelectors,
} from '../../containers/logging_legacy/state';

export const withStreamItems = connect(
  (state: State) => ({
    endLoadingState: entriesSelectors.selectEntriesEndLoadingState(state),
    items: selectItems(state),
    scale: textviewSelectors.selectTextviewScale(state),
    startLoadingState: entriesSelectors.selectEntriesStartLoadingState(state),
    target: targetSelectors.selectTarget(state),
    wrap: textviewSelectors.selectTextviewWrap(state),
  }),
  bindPlainActionCreators({
    jumpToTarget: targetActions.jumpToTarget,
    reportVisibleInterval: entriesActions.reportVisibleEntries,
  })
);

const selectItems = createSelector(
  entriesSelectors.selectEntries,
  searchResultsSelectors.selectSearchResultsById,
  (logEntries, searchResults) =>
    logEntries.map(logEntry =>
      createLogEntryStreamItem(logEntry, searchResults[logEntry.gid] || null)
    )
);

const createLogEntryStreamItem = (logEntry: LogEntry, searchResult?: SearchResult) => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
  searchResult,
});
