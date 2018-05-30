/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import {
  getIndexOfLogEntry,
  LogEntry,
  LogEntryTime,
} from '../../../../../common/log_entry';
import { EntriesState } from './reducer';

const getEntry = (entries: LogEntry[], entryKey: LogEntryTime) => {
  const entryIndex = getIndexOfLogEntry(entries, entryKey);

  return entryIndex !== null ? entries[entryIndex] : null;
};

export const selectEntries = (state: EntriesState) => state.entries;

export const selectEntriesStartLoadingState = (state: EntriesState) =>
  state.start;

export const selectEntriesEndLoadingState = (state: EntriesState) => state.end;

export const selectFirstEntry = createSelector(
  selectEntries,
  entries => (entries.length > 0 ? entries[0] : null)
);

export const selectLastEntry = createSelector(
  selectEntries,
  entries => (entries.length > 0 ? entries[entries.length - 1] : null)
);

export const selectLoadedEntriesTimeInterval = createSelector(
  selectFirstEntry,
  selectLastEntry,
  (firstEntry, lastEntry) => ({
    end: lastEntry ? lastEntry.fields.time : null,
    start: firstEntry ? firstEntry.fields.time : null,
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
    end: lastVisibleEntry ? lastVisibleEntry.fields.time : null,
    start: firstVisibleEntry ? firstVisibleEntry.fields.time : null,
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
