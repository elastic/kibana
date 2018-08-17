/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { initialMinimapState, minimapReducer, MinimapState } from './log_minimap';
import { initialLogPositionState, logPositionReducer, LogPositionState } from './log_position';
import { initialTextviewState, textviewReducer, TextviewState } from './log_textview';

export interface LocalState {
  logMinimap: MinimapState;
  logPosition: LogPositionState;
  logTextview: TextviewState;
}

export const initialLocalState = {
  logMinimap: initialMinimapState,
  logPosition: initialLogPositionState,
  logTextview: initialTextviewState,
};

export const localReducer = combineReducers<LocalState>({
  logMinimap: minimapReducer,
  logPosition: logPositionReducer,
  logTextview: textviewReducer,
});
