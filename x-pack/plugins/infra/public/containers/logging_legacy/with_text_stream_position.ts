/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import {
  entriesActions,
  entriesSelectors,
  logPositionActions,
  sharedSelectors,
  State,
} from '../../store';
import { getLogEntryKey } from '../../utils/log_entry';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withTextStreamPosition = connect(
  (state: State) => ({
    firstVisibleLogEntry: entriesSelectors.selectFirstVisibleEntry(state),
    lastVisibleLogEntry: entriesSelectors.selectLastVisibleEntry(state),
    visibleTimeInterval: selectVisibleTimeInterval(state),
    visibleMidpoint: sharedSelectors.selectVisibleMidpointOrTargetTime(state),
  }),
  bindPlainActionCreators({
    jumpToPosition: logPositionActions.jumpToTargetPosition,
    reportVisibleInterval: entriesActions.reportVisibleEntries,
  })
);

export const WithTextStreamPosition = asChildFunctionRenderer(withTextStreamPosition);

const selectVisibleTimeInterval = createSelector(
  entriesSelectors.selectFirstVisibleEntry,
  entriesSelectors.selectLastVisibleEntry,
  (firstVisibleEntry, lastVisibleEntry) =>
    firstVisibleEntry && lastVisibleEntry
      ? {
          start: getLogEntryKey(firstVisibleEntry).time,
          end: getLogEntryKey(lastVisibleEntry).time,
        }
      : null
);
