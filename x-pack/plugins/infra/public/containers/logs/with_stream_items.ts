/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { logEntriesActions, logEntriesSelectors, logPositionSelectors, State } from '../../store';
import { LogEntry } from '../../utils/log_entry';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withStreamItems = connect(
  (state: State) => ({
    isReloading: logEntriesSelectors.selectIsReloadingEntries(state),
    isLoadingMore: logEntriesSelectors.selectIsLoadingMoreEntries(state),
    hasMoreBeforeStart: logEntriesSelectors.selectHasMoreBeforeStart(state),
    hasMoreAfterEnd: logEntriesSelectors.selectHasMoreAfterEnd(state),
    lastLoadedTime: logEntriesSelectors.selectEntriesLastLoadedTime(state),
    items: selectItems(state),
  }),
  bindPlainActionCreators({
    loadNewerEntries: logEntriesActions.loadNewerEntries,
    reloadEntries: logEntriesActions.reloadEntries,
  })
);

export const WithStreamItems = asChildFunctionRenderer(withStreamItems, {
  onInitialize: props => {
    if (!props.isReloading && !props.isLoadingMore) {
      props.reloadEntries();
    }
  },
});

const selectItems = createSelector(
  logEntriesSelectors.selectEntries,
  logEntriesSelectors.selectIsReloadingEntries,
  logPositionSelectors.selectIsAutoReloading,
  // searchResultsSelectors.selectSearchResultsById,
  (logEntries, isReloading, isAutoReloading /* , searchResults */) =>
    isReloading && !isAutoReloading
      ? []
      : logEntries.map(logEntry =>
          createLogEntryStreamItem(logEntry /* , searchResults[logEntry.gid] || null */)
        )
);

const createLogEntryStreamItem = (logEntry: LogEntry) => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
});
