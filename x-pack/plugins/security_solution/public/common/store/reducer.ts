/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { appReducer, AppState, initialAppState } from './app';
import { dragAndDropReducer, DragAndDropState, initialDragAndDropState } from './drag_and_drop';
import { createInitialInputsState, initialInputsState, inputsReducer, InputsState } from './inputs';

import { HostsPluginState, HostsPluginReducer } from '../../hosts/store';
import { NetworkPluginState, NetworkPluginReducer } from '../../network/store';
import { TimelinePluginState, TimelinePluginReducer } from '../../timelines/store/timeline';
import {
  EndpointAlertsPluginState,
  EndpointAlertsPluginReducer,
} from '../../endpoint_alerts/store';
import { EndpointHostsPluginState, EndpointHostsPluginReducer } from '../../endpoint_hosts/store';

import { ManagementPluginReducer, ManagementPluginState } from '../../management/store/types';

export interface State
  extends HostsPluginState,
    NetworkPluginState,
    TimelinePluginState,
    EndpointAlertsPluginState,
    EndpointHostsPluginState,
    ManagementPluginState {
  app: AppState;
  dragAndDrop: DragAndDropState;
  inputs: InputsState;
}

export const initialState: Pick<State, 'app' | 'dragAndDrop' | 'inputs'> = {
  app: initialAppState,
  dragAndDrop: initialDragAndDropState,
  inputs: initialInputsState,
};

type SubPluginsInitState = HostsPluginState &
  NetworkPluginState &
  TimelinePluginState &
  EndpointAlertsPluginState &
  EndpointHostsPluginState &
  ManagementPluginState;

export type SubPluginsInitReducer = HostsPluginReducer &
  NetworkPluginReducer &
  TimelinePluginReducer &
  EndpointAlertsPluginReducer &
  EndpointHostsPluginReducer &
  ManagementPluginReducer;

export const createInitialState = (pluginsInitState: SubPluginsInitState): State => ({
  ...initialState,
  ...pluginsInitState,
  inputs: createInitialInputsState(),
});

export const createReducer = (pluginsReducer: SubPluginsInitReducer) =>
  combineReducers<State>({
    app: appReducer,
    dragAndDrop: dragAndDropReducer,
    inputs: inputsReducer,
    ...pluginsReducer,
  });
