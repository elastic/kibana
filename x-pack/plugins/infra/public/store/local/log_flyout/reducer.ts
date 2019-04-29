/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { hideFlyout, setFlyoutItem, showFlyout } from './actions';

export enum FlyoutVisibility {
  hidden = 'hidden',
  visible = 'visible',
}

export interface FlyoutOptionsState {
  visibility: FlyoutVisibility;
  itemId: string;
}

export const initialFlyoutOptionsState: FlyoutOptionsState = {
  visibility: FlyoutVisibility.hidden,
  itemId: '',
};

const currentFlyoutReducer = reducerWithInitialState(initialFlyoutOptionsState.itemId).case(
  setFlyoutItem,
  (current, target) => target
);

const currentFlyoutVisibilityReducer = reducerWithInitialState(initialFlyoutOptionsState.visibility)
  .case(hideFlyout, () => FlyoutVisibility.hidden)
  .case(showFlyout, () => FlyoutVisibility.visible);

export const flyoutOptionsReducer = combineReducers<FlyoutOptionsState>({
  itemId: currentFlyoutReducer,
  visibility: currentFlyoutVisibilityReducer,
});
