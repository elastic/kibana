/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { TimeKey } from '../../../../../common/time';
import { getLogEntryIndexAtTime, LogEntry } from '../../../../utils/log_entry';
import { createGraphqlStateSelectors } from '../../../../utils/remote_state/remote_graphql_state';
import { EntriesGraphqlState, EntriesState } from './state';

const entriesGraphlStateSelectors = createGraphqlStateSelectors<EntriesGraphqlState['data']>(
  (state: EntriesState) => state.entries
);

const getEntry = (entries: LogEntry[], entryKey: TimeKey) => {
  const entryIndex = getLogEntryIndexAtTime(entries, entryKey);

  return entryIndex !== null ? entries[entryIndex] : null;
};

export const selectEntries = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data ? data.entries : [])
);

export const selectIsLoadingEntries = entriesGraphlStateSelectors.selectIsLoading;

export const selectIsReloadingEntries = createSelector(
  entriesGraphlStateSelectors.selectIsLoading,
  entriesGraphlStateSelectors.selectLoadingProgressOperationInfo,
  (isLoading, operationInfo) =>
    isLoading && operationInfo ? operationInfo.operationKey === 'load' : false
);

export const selectIsLoadingMoreEntries = createSelector(
  entriesGraphlStateSelectors.selectIsLoading,
  entriesGraphlStateSelectors.selectLoadingProgressOperationInfo,
  (isLoading, operationInfo) =>
    isLoading && operationInfo ? operationInfo.operationKey === 'load_more' : false
);

export const selectEntriesStart = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data && data.start ? data.start : null)
);

export const selectEntriesEnd = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data && data.end ? data.end : null)
);

export const selectHasMoreBeforeStart = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data ? data.hasMoreBefore : true)
);

export const selectHasMoreAfterEnd = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => (data ? data.hasMoreAfter : true)
);

export const selectEntriesStartLoadingState = entriesGraphlStateSelectors.selectLoadingState;

export const selectEntriesEndLoadingState = entriesGraphlStateSelectors.selectLoadingState;

export const selectFirstEntry = createSelector(
  selectEntries,
  entries => (entries.length > 0 ? entries[0] : null)
);

export const selectLastEntry = createSelector(
  selectEntries,
  entries => (entries.length > 0 ? entries[entries.length - 1] : null)
);

export const selectLoadedEntriesTimeInterval = createSelector(
  entriesGraphlStateSelectors.selectData,
  data => ({
    end: data && data.end ? data.end.time : null,
    start: data && data.start ? data.start.time : null,
  })
);

export const selectFirstVisibleEntry = createSelector(
  selectEntries,
  (state: EntriesState) => state.visible.startKey,
  (entries, firstVisibleEntryKey) =>
    firstVisibleEntryKey ? getEntry(entries, firstVisibleEntryKey) : null
);

export const selectMiddleVisibleEntry = createSelector(
  selectEntries,
  (state: EntriesState) => state.visible.middleKey,
  (entries, middleVisibleEntryKey) =>
    middleVisibleEntryKey ? getEntry(entries, middleVisibleEntryKey) : null
);

export const selectLastVisibleEntry = createSelector(
  selectEntries,
  (state: EntriesState) => state.visible.endKey,
  (entries, lastVisibleEntryKey) =>
    lastVisibleEntryKey ? getEntry(entries, lastVisibleEntryKey) : null
);

export const selectVisibleEntriesTimeInterval = createSelector(
  selectFirstVisibleEntry,
  selectLastVisibleEntry,
  (firstVisibleEntry, lastVisibleEntry) => ({
    end: lastVisibleEntry ? lastVisibleEntry.key.time : null,
    start: firstVisibleEntry ? firstVisibleEntry.key.time : null,
  })
);

export const selectIsFirstEntryVisible = createSelector(
  selectFirstEntry,
  selectFirstVisibleEntry,
  (firstEntry, firstVisibleEntry) => firstEntry === firstVisibleEntry
);

export const selectIsLastEntryVisible = createSelector(
  selectLastEntry,
  selectLastVisibleEntry,
  (lastEntry, lastVisibleEntry) => lastEntry === lastVisibleEntry
);
