/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { Reducer, CombinedState } from 'redux';
import { routes } from './routes';
import { StartPlugins } from '../types';
import { SecuritySubPluginWithStore } from '../app/types';
import { managementReducer } from './store/reducer';
import { AppAction } from '../common/store/actions';
import { managementMiddlewareFactory } from './store/middleware';
import { ManagementState } from './types';

/**
 * Internally, our state is sometimes immutable, ignore that in our external
 * interface.
 */
export interface ManagementPluginState {
  management: ManagementState;
}

/**
 * Internally, we use `ImmutableReducer`, but we present a regular reducer
 * externally for compatibility w/ regular redux.
 */
export interface ManagementPluginReducer {
  management: Reducer<CombinedState<ManagementState>, AppAction>;
}

export class Management {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'management', ManagementState> {
    return {
      routes,
      store: {
        initialState: {
          /**
           * Cast the state to ManagementState for compatibility with
           * the subplugin architecture (which expects initialize state.)
           * but you do not need it because this plugin is doing it through its middleware
           */
          management: {} as ManagementState,
        },
        /**
         * Cast the ImmutableReducer to a regular reducer for compatibility with
         * the subplugin architecture (which expects plain redux reducers.)
         */
        reducer: { management: managementReducer } as unknown as ManagementPluginReducer,
        middleware: managementMiddlewareFactory(core, plugins),
      },
    };
  }
}
