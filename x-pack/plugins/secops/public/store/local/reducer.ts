/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { dragAndDropReducer, DragAndDropState, initialDragAndDropState } from './drag_and_drop';
import { initialTimelineState, timelineReducer, TimelineState } from './timeline';

export interface LocalState {
  dragAndDrop: DragAndDropState;
  timeline: TimelineState;
}

export const initialLocalState: LocalState = {
  dragAndDrop: initialDragAndDropState,
  timeline: initialTimelineState,
};

export const localReducer = combineReducers<LocalState>({
  dragAndDrop: dragAndDropReducer,
  timeline: timelineReducer,
});
