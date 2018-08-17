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
  // searchResultsSelectors,
  logPositionActions,
  logPositionSelectors,
  State,
} from '../../store';
import { LogEntry, LogEntryMessageSegment } from '../../utils/log_entry';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withStreamItems = connect(
  (state: State) => ({
    isReloading: entriesSelectors.selectIsReloadingEntries(state),
    isLoadingMore: entriesSelectors.selectIsLoadingMoreEntries(state),
    hasMoreBeforeStart: entriesSelectors.selectHasMoreBeforeStart(state),
    hasMoreAfterEnd: entriesSelectors.selectHasMoreAfterEnd(state),
    isStreaming: logPositionSelectors.selectIsAutoReloading(state),
    lastLoadedTime: entriesSelectors.selectEntriesLastLoadedTime(state),
    items: selectItems(state),
    target: logPositionSelectors.selectTargetPosition(state),
  }),
  bindPlainActionCreators({
    jumpToTarget: logPositionActions.jumpToTargetPosition,
    reportVisibleInterval: entriesActions.reportVisibleEntries,
  })
);

export const WithStreamItems = asChildFunctionRenderer(withStreamItems);

const selectItems = createSelector(
  entriesSelectors.selectEntries,
  entriesSelectors.selectIsReloadingEntries,
  logPositionSelectors.selectIsAutoReloading,
  // searchResultsSelectors.selectSearchResultsById,
  (logEntries, isReloading, isAutoReloading /*, searchResults*/) =>
    isReloading && !isAutoReloading
      ? []
      : logEntries.map(logEntry =>
          createLogEntryStreamItem(logEntry /*, searchResults[logEntry.gid] || null*/)
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
