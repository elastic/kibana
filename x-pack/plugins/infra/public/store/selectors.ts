/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

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

export const minimapSelectors = globalizeSelectors(selectLocal, localLogMinimapSelectors);
export const logPositionSelectors = globalizeSelectors(selectLocal, localLogPositionSelectors);
export const textviewSelectors = globalizeSelectors(selectLocal, localLogTextviewSelectors);

/**
 * remote selectors
 */

const selectRemote = (state: State) => state.remote;

export const entriesSelectors = globalizeSelectors(selectRemote, remoteLogEntriesSelectors);
export const sourceSelectors = globalizeSelectors(selectRemote, remoteSourceSelectors);
export const summarySelectors = globalizeSelectors(selectRemote, remoteLogSummarySelectors);

/**
 * shared selectors
 */

export const sharedSelectors = {
  selectVisibleMidpointOrTargetTime: createSelector(
    entriesSelectors.selectFirstVisibleEntry,
    entriesSelectors.selectLastVisibleEntry,
    logPositionSelectors.selectTargetPosition,
    (firstVisibleEntry, lastVisibleEntry, target) => {
      if (firstVisibleEntry && lastVisibleEntry) {
        return (firstVisibleEntry.key.time + lastVisibleEntry.key.time) / 2;
      } else if (firstVisibleEntry) {
        return firstVisibleEntry.key.time;
      } else if (lastVisibleEntry) {
        return lastVisibleEntry.key.time;
      } else if (target) {
        return target.time;
      } else {
        return null;
      }
    }
  ),
};
