/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { appReducer, AppState, initialAppState } from './app';
import { dragAndDropReducer, DragAndDropState, initialDragAndDropState } from './drag_and_drop';
import { hostsReducer, HostsState, initialHostsState } from './hosts';
import { initialInputsState, inputsReducer, InputsState } from './inputs';
import { initialNetworkState, networkReducer, NetworkState } from './network';
import { TimelineState, initialTimelineState, timelineReducer } from './timeline/reducer';

export interface State {
  app: AppState;
  dragAndDrop: DragAndDropState;
  hosts: HostsState;
  inputs: InputsState;
  network: NetworkState;
  timeline: TimelineState;
}

export const initialState: State = {
  app: initialAppState,
  dragAndDrop: initialDragAndDropState,
  hosts: initialHostsState,
  inputs: initialInputsState,
  network: initialNetworkState,
  timeline: initialTimelineState,
};

export const reducer = combineReducers<State>({
  app: appReducer,
  dragAndDrop: dragAndDropReducer,
  hosts: hostsReducer,
  inputs: inputsReducer,
  network: networkReducer,
  timeline: timelineReducer,
});
