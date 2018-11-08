/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialTimelineState, timelineReducer, TimelineState } from './timeline';

export interface LocalState {
  timeline: TimelineState;
}

export const initialLocalState: LocalState = {
  timeline: initialTimelineState,
};

export const localReducer = combineReducers<LocalState>({
  timeline: timelineReducer,
});
