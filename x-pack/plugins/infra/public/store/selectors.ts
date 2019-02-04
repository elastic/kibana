/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { getLogEntryAtTime } from '../utils/log_entry';
import { globalizeSelectors } from '../utils/typed_redux';
import {
  flyoutOptionsSelectors as localFlyoutOptionsSelectors,
  logFilterSelectors as localLogFilterSelectors,
  logMinimapSelectors as localLogMinimapSelectors,
  logPositionSelectors as localLogPositionSelectors,
  logTextviewSelectors as localLogTextviewSelectors,
  metricTimeSelectors as localMetricTimeSelectors,
  waffleFilterSelectors as localWaffleFilterSelectors,
  waffleOptionsSelectors as localWaffleOptionsSelectors,
  waffleTimeSelectors as localWaffleTimeSelectors,
} from './local';
import { State } from './reducer';
import {
  logEntriesSelectors as remoteLogEntriesSelectors,
  logSummarySelectors as remoteLogSummarySelectors,
} from './remote';

/**
 * local selectors
 */

const selectLocal = (state: State) => state.local;

export const logFilterSelectors = globalizeSelectors(selectLocal, localLogFilterSelectors);
export const logMinimapSelectors = globalizeSelectors(selectLocal, localLogMinimapSelectors);
export const logPositionSelectors = globalizeSelectors(selectLocal, localLogPositionSelectors);
export const logTextviewSelectors = globalizeSelectors(selectLocal, localLogTextviewSelectors);
export const metricTimeSelectors = globalizeSelectors(selectLocal, localMetricTimeSelectors);
export const waffleFilterSelectors = globalizeSelectors(selectLocal, localWaffleFilterSelectors);
export const waffleTimeSelectors = globalizeSelectors(selectLocal, localWaffleTimeSelectors);
export const waffleOptionsSelectors = globalizeSelectors(selectLocal, localWaffleOptionsSelectors);
export const flyoutOptionsSelectors = globalizeSelectors(selectLocal, localFlyoutOptionsSelectors);

/**
 * remote selectors
 */

const selectRemote = (state: State) => state.remote;

export const logEntriesSelectors = globalizeSelectors(selectRemote, remoteLogEntriesSelectors);
export const logSummarySelectors = globalizeSelectors(selectRemote, remoteLogSummarySelectors);

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
