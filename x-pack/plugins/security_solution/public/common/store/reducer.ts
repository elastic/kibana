/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Reducer } from 'redux';
import { combineReducers } from 'redux';

import type { DataTableState } from '@kbn/securitysolution-data-table';
import { dataTableReducer } from '@kbn/securitysolution-data-table';
import { appReducer, initialAppState } from './app';
import { dragAndDropReducer, initialDragAndDropState } from './drag_and_drop';
import { createInitialInputsState, inputsReducer } from './inputs';
import { sourcererReducer, sourcererModel } from './sourcerer';

import type { HostsPluginReducer } from '../../explore/hosts/store';
import type { NetworkPluginReducer } from '../../explore/network/store';
import type { UsersPluginReducer } from '../../explore/users/store';
import type { TimelinePluginReducer } from '../../timelines/store/timeline';

import type { SecuritySubPlugins } from '../../app/types';
import type { ManagementPluginReducer } from '../../management';
import type { State } from './types';
import type { AppAction } from './actions';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { globalUrlParamReducer, initialGlobalUrlParam } from './global_url_param';
import { groupsReducer } from './grouping/reducer';
import type { GroupState } from './grouping/types';

export type SubPluginsInitReducer = HostsPluginReducer &
  UsersPluginReducer &
  NetworkPluginReducer &
  TimelinePluginReducer &
  ManagementPluginReducer;
/**
 * Factory for the 'initialState' that is used to preload state into the Security App's redux store.
 */
export const createInitialState = (
  pluginsInitState: Omit<
    SecuritySubPlugins['store']['initialState'],
    'app' | 'dragAndDrop' | 'inputs' | 'sourcerer' | 'globalUrlParam'
  >,
  {
    enableExperimental,
  }: {
    enableExperimental: ExperimentalFeatures;
  },
  dataTableState: DataTableState,
  groupsState: GroupState
): State => {
  const preloadedState: State = {
    ...pluginsInitState,
    app: { ...initialAppState, enableExperimental },
    dragAndDrop: initialDragAndDropState,
    inputs: createInitialInputsState(enableExperimental.socTrendsEnabled),
    sourcerer: sourcererModel.initialSourcererState,
    globalUrlParam: initialGlobalUrlParam,
    dataTable: dataTableState.dataTable,
    groups: groupsState.groups,
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
    globalUrlParam: globalUrlParamReducer,
    dataTable: dataTableReducer,
    groups: groupsReducer,
    ...pluginsReducer,
  });
