/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
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
    setSourceId: logEntriesActions.setSourceId,
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

/**
 * This component serves as connection between the state and side-effects
 * managed by redux and the state and effects managed by hooks. In particular,
 * it forwards changes of the source id to redux via the action creator
 * `setSourceId`.
 *
 * It will be mounted beneath the hierachy level where the redux store and the
 * source state are initialized. Once the log entry state and loading
 * side-effects have been migrated from redux to hooks it can be removed.
 */
export const ReduxSourceIdBridge = withStreamItems(
  ({ setSourceId, sourceId }: { setSourceId: (sourceId: string) => void; sourceId: string }) => {
    useEffect(
      () => {
        setSourceId(sourceId);
      },
      [setSourceId, sourceId]
    );

    return null;
  }
);
