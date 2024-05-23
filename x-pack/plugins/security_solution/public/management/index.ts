/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { Reducer, CombinedState } from 'redux';
import type { StartPlugins } from '../types';
import type { SecuritySubPluginWithStore } from '../app/types';
import { managementReducer } from './store/reducer';
import type { AppAction } from '../common/store/actions';
import { managementMiddlewareFactory } from './store/middleware';
import type { ManagementState } from './types';
import { MANAGE_PATH } from '../../common';
import { MANAGEMENT_PATH } from '../../common/constants';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

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

const loadRoutes = () =>
  import(
    /* webpackChunkName: "sub_plugin-management" */
    './routes'
  );

const ManagementLandingLazy = React.lazy(() =>
  loadRoutes().then(({ ManagementLanding }) => ({ default: ManagementLanding }))
);
const ManagementRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ ManagementRoutes }) => ({ default: ManagementRoutes }))
);

export class Management {
  public setup() {}

  public start(
    core: CoreStart,
    plugins: StartPlugins
  ): SecuritySubPluginWithStore<'management', ManagementState> {
    return {
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
      routes: [
        {
          path: MANAGE_PATH,
          component: withSubPluginRouteSuspense(ManagementLandingLazy),
        },
        {
          path: MANAGEMENT_PATH,
          component: withSubPluginRouteSuspense(ManagementRoutesLazy),
        },
      ],
    };
  }
}
