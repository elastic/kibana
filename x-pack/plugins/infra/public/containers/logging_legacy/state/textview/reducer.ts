/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { TextScale } from '../../../../../common/log_text_scale';
import { setTextviewScale, setTextviewWrap } from './actions';

export interface TextviewState {
  scale: TextScale;
  wrap: boolean;
}

export const initialTextviewState: TextviewState = {
  scale: 'medium',
  wrap: true,
};

const textviewScaleReducer = reducerWithInitialState(initialTextviewState.scale).case(
  setTextviewScale,
  (state, scale) => scale
);

const textviewWrapReducer = reducerWithInitialState(initialTextviewState.wrap).case(
  setTextviewWrap,
  (state, wrap) => wrap
);

export const textviewReducer = combineReducers<TextviewState>({
  scale: textviewScaleReducer,
  wrap: textviewWrapReducer,
});
