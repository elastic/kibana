/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { SearchResult } from '../../../common/log_search_result';
import {
  entriesActions,
  entriesSelectors,
  searchResultsSelectors,
  State,
  targetActions,
  targetSelectors,
} from '../../containers/logging_legacy/state';
import { LogEntry, LogEntryMessageSegment } from '../../utils/log_entry';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withStreamItems = connect(
  (state: State) => ({
    endLoadingState: entriesSelectors.selectEntriesEndLoadingState(state),
    items: selectItems(state),
    startLoadingState: entriesSelectors.selectEntriesStartLoadingState(state),
    target: targetSelectors.selectTarget(state),
  }),
  bindPlainActionCreators({
    jumpToTarget: targetActions.jumpToTarget,
    reportVisibleInterval: entriesActions.reportVisibleEntries,
  })
);

export const WithStreamItems = asChildFunctionRenderer(withStreamItems);

const selectItems = createSelector(
  entriesSelectors.selectEntries,
  entriesSelectors.selectIsReloadingEntries,
  searchResultsSelectors.selectSearchResultsById,
  (logEntries, isReloading, searchResults) =>
    isReloading
      ? []
      : logEntries.map(logEntry =>
          createLogEntryStreamItem(logEntry, searchResults[logEntry.gid] || null)
        )
);

const createLogEntryStreamItem = (logEntry: LogEntry, searchResult?: SearchResult) => ({
  kind: 'logEntry' as 'logEntry',
  logEntry: {
    gid: logEntry.gid,
    origin: {
      id: logEntry.gid,
      index: '',
      type: '',
    },
    fields: {
      time: logEntry.key.time,
      tiebreaker: logEntry.key.tiebreaker,
      message: logEntry.message.map(formatMessageSegment).join(' '),
    },
  },
  searchResult,
});

const formatMessageSegment = (messageSegment: LogEntryMessageSegment): string =>
  messageSegment.__typename === 'InfraLogMessageFieldSegment'
    ? messageSegment.value
    : messageSegment.__typename === 'InfraLogMessageConstantSegment'
      ? messageSegment.constant
      : 'failed to format message';
