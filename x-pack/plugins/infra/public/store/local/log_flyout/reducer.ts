/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { setFlyoutItem, showFlyout } from './actions';

export interface FlyoutOptionsState {
  isFlyoutVisible: boolean | null;
  flyoutId: string | null;
}

export const initialFlyoutOptionsState: FlyoutOptionsState = {
  flyoutId: null,
  isFlyoutVisible: false,
};

const currentFlyoutReducer = reducerWithInitialState(initialFlyoutOptionsState.flyoutId).case(
  setFlyoutItem,
  (current, target) => target
);

const currentFlyoutVisibilityReducer = reducerWithInitialState(
  initialFlyoutOptionsState.isFlyoutVisible
).case(showFlyout, (current, target) => target);

export const flyoutOptionsReducer = combineReducers<FlyoutOptionsState>({
  isFlyoutVisible: currentFlyoutVisibilityReducer,
  flyoutId: currentFlyoutReducer,
});
