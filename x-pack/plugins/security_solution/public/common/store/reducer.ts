/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, PreloadedState, AnyAction, Reducer } from 'redux';

import { appReducer, initialAppState } from './app';
import { dragAndDropReducer, initialDragAndDropState } from './drag_and_drop';
import { createInitialInputsState, inputsReducer } from './inputs';

import { HostsPluginReducer } from '../../hosts/store';
import { NetworkPluginReducer } from '../../network/store';
import { TimelinePluginReducer } from '../../timelines/store/timeline';

import { SecuritySubPlugins } from '../../app/types';
import { ManagementPluginReducer } from '../../management';
import { State } from './types';
import { AppAction } from './actions';

export type SubPluginsInitReducer = HostsPluginReducer &
  NetworkPluginReducer &
  TimelinePluginReducer &
  ManagementPluginReducer;

/**
 * Factory for the 'initialState' that is used to preload state into the Security App's redux store.
 */
export const createInitialState = (
  pluginsInitState: SecuritySubPlugins['store']['initialState']
): PreloadedState<State> => {
  const preloadedState: PreloadedState<State> = {
    app: initialAppState,
    dragAndDrop: initialDragAndDropState,
    ...pluginsInitState,
    inputs: createInitialInputsState(),
  };
  return preloadedState;
};

/**
 * Factory for the Security app's redux reducer.
 */
export const createReducer: (
  pluginsReducer: SubPluginsInitReducer
) => Reducer<State, AppAction | AnyAction> = (pluginsReducer: SubPluginsInitReducer) =>
  combineReducers({
    app: appReducer,
    dragAndDrop: dragAndDropReducer,
    inputs: inputsReducer,
    ...pluginsReducer,
  });
