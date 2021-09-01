/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers, PreloadedState, AnyAction, Reducer } from 'redux';

import { appReducer, initialAppState } from './app';
import { dragAndDropReducer, initialDragAndDropState } from './drag_and_drop';
import { createInitialInputsState, inputsReducer } from './inputs';
import { sourcererReducer, sourcererModel } from './sourcerer';

import { HostsPluginReducer } from '../../hosts/store';
import { NetworkPluginReducer } from '../../network/store';
import { UebaPluginReducer } from '../../ueba/store';
import { TimelinePluginReducer } from '../../timelines/store/timeline';

import { SecuritySubPlugins } from '../../app/types';
import { ManagementPluginReducer } from '../../management';
import { State } from './types';
import { AppAction } from './actions';
import { KibanaIndexPattern, KibanaIndexPatterns, SourcererScopeName } from './sourcerer/model';
import { ExperimentalFeatures } from '../../../common/experimental_features';

export type SubPluginsInitReducer = HostsPluginReducer &
  UebaPluginReducer &
  NetworkPluginReducer &
  TimelinePluginReducer &
  ManagementPluginReducer;
/**
 * Factory for the 'initialState' that is used to preload state into the Security App's redux store.
 */
export const createInitialState = (
  pluginsInitState: SecuritySubPlugins['store']['initialState'],
  {
    defaultIndexPattern,
    kibanaIndexPatterns,
    signalIndexName,
    enableExperimental,
  }: {
    defaultIndexPattern: KibanaIndexPattern;
    kibanaIndexPatterns: KibanaIndexPatterns;
    signalIndexName: string | null;
    enableExperimental: ExperimentalFeatures;
  }
): PreloadedState<State> => {
  const initialPatterns = {
    [SourcererScopeName.default]: defaultIndexPattern.patternList.filter(
      (index) => index !== signalIndexName
    ),
    [SourcererScopeName.detections]: defaultIndexPattern.patternList.filter(
      (index) => index === signalIndexName
    ),
    [SourcererScopeName.timeline]: defaultIndexPattern.patternList,
  };
  const preloadedState: PreloadedState<State> = {
    app: { ...initialAppState, enableExperimental },
    dragAndDrop: initialDragAndDropState,
    ...pluginsInitState,
    inputs: createInitialInputsState(),
    sourcerer: {
      ...sourcererModel.initialSourcererState,
      sourcererScopes: {
        ...sourcererModel.initialSourcererState.sourcererScopes,
        [SourcererScopeName.default]: {
          ...sourcererModel.initialSourcererState.sourcererScopes.default,
          selectedKipId: defaultIndexPattern.id,
          selectedPatterns: initialPatterns[SourcererScopeName.default],
          indicesExist: initialPatterns[SourcererScopeName.default].length > 0,
        },
        [SourcererScopeName.detections]: {
          ...sourcererModel.initialSourcererState.sourcererScopes.detections,
          selectedKipId: defaultIndexPattern.id,
          selectedPatterns: initialPatterns[SourcererScopeName.detections],
          indicesExist: initialPatterns[SourcererScopeName.detections].length > 0,
        },
        [SourcererScopeName.timeline]: {
          ...sourcererModel.initialSourcererState.sourcererScopes.timeline,
          selectedKipId: defaultIndexPattern.id,
          selectedPatterns: initialPatterns[SourcererScopeName.timeline],
          indicesExist: initialPatterns[SourcererScopeName.timeline].length > 0,
        },
      },
      defaultIndexPattern,
      kibanaIndexPatterns,
      signalIndexName,
    },
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
    sourcerer: sourcererReducer,
    ...pluginsReducer,
  });
