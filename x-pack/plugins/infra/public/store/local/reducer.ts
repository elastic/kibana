/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialLogMinimapState, logMinimapReducer, LogMinimapState } from './log_minimap';
import { initialLogPositionState, logPositionReducer, LogPositionState } from './log_position';
import { initialLogTextviewState, logTextviewReducer, LogTextviewState } from './log_textview';

export interface LocalState {
  logMinimap: LogMinimapState;
  logPosition: LogPositionState;
  logTextview: LogTextviewState;
}

export const initialLocalState = {
  logMinimap: initialLogMinimapState,
  logPosition: initialLogPositionState,
  logTextview: initialLogTextviewState,
};

export const localReducer = combineReducers<LocalState>({
  logMinimap: logMinimapReducer,
  logPosition: logPositionReducer,
  logTextview: logTextviewReducer,
});
