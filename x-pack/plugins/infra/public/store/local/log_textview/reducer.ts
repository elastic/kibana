/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { TextScale } from '../../../../common/log_text_scale';
import { setTextviewScale, setTextviewWrap } from './actions';

export interface LogTextviewState {
  scale: TextScale;
  wrap: boolean;
}

export const initialLogTextviewState: LogTextviewState = {
  scale: 'medium',
  wrap: true,
};

const textviewScaleReducer = reducerWithInitialState(initialLogTextviewState.scale).case(
  setTextviewScale,
  (state, scale) => scale
);

const textviewWrapReducer = reducerWithInitialState(initialLogTextviewState.wrap).case(
  setTextviewWrap,
  (state, wrap) => wrap
);

export const logTextviewReducer = combineReducers<LogTextviewState>({
  scale: textviewScaleReducer,
  wrap: textviewWrapReducer,
});
