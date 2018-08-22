/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { getLogEntryAtTime } from '../utils/log_entry';
import { globalizeSelectors } from '../utils/typed_redux';
import {
  logMinimapSelectors as localLogMinimapSelectors,
  logPositionSelectors as localLogPositionSelectors,
  logTextviewSelectors as localLogTextviewSelectors,
} from './local';
import { State } from './reducer';
import {
  logEntriesSelectors as remoteLogEntriesSelectors,
  logSummarySelectors as remoteLogSummarySelectors,
  sourceSelectors as remoteSourceSelectors,
} from './remote';

/**
 * local selectors
 */

const selectLocal = (state: State) => state.local;

export const logMinimapSelectors = globalizeSelectors(selectLocal, localLogMinimapSelectors);
export const logPositionSelectors = globalizeSelectors(selectLocal, localLogPositionSelectors);
export const logTextviewSelectors = globalizeSelectors(selectLocal, localLogTextviewSelectors);

/**
 * remote selectors
 */

const selectRemote = (state: State) => state.remote;

export const logEntriesSelectors = globalizeSelectors(selectRemote, remoteLogEntriesSelectors);
export const logSummarySelectors = globalizeSelectors(selectRemote, remoteLogSummarySelectors);
export const sourceSelectors = globalizeSelectors(selectRemote, remoteSourceSelectors);

/**
 * shared selectors
 */

export const sharedSelectors = {
  selectFirstVisibleLogEntry: createSelector(
    logEntriesSelectors.selectEntries,
    logPositionSelectors.selectFirstVisiblePosition,
    (entries, firstVisiblePosition) =>
      firstVisiblePosition ? getLogEntryAtTime(entries, firstVisiblePosition) : null
  ),
  selectMiddleVisibleLogEntry: createSelector(
    logEntriesSelectors.selectEntries,
    logPositionSelectors.selectMiddleVisiblePosition,
    (entries, middleVisiblePosition) =>
      middleVisiblePosition ? getLogEntryAtTime(entries, middleVisiblePosition) : null
  ),
  selectLastVisibleLogEntry: createSelector(
    logEntriesSelectors.selectEntries,
    logPositionSelectors.selectLastVisiblePosition,
    (entries, lastVisiblePosition) =>
      lastVisiblePosition ? getLogEntryAtTime(entries, lastVisiblePosition) : null
  ),
};
