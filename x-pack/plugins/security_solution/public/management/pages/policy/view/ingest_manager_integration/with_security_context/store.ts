/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  Dispatch,
  Middleware,
  PreloadedState,
  ReducersMapObject,
} from 'redux';
import { CoreStart } from 'kibana/public';
import { managementReducer } from '../../../../../store/reducer';
import { appReducer } from '../../../../../../common/store/app';
import { ExperimentalFeaturesService } from '../../../../../../common/experimental_features_service';
import { managementMiddlewareFactory } from '../../../../../store/middleware';
import type { StartPlugins } from '../../../../../../types';
import type { State } from '../../../../../../common/store';
import type { AppAction } from '../../../../../../common/store/actions';
import type { Immutable } from '../../../../../../../common/endpoint/types';

type ComposeType = typeof compose;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: ComposeType;
  }
}
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

interface CreateFleetContextReduxStoreProps {
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  /** `reducersObject` should be used for testing only */
  reducersObject?: ReducersMapObject;
  /** `preloadedState` should be used for testing only */
  preloadedState?: PreloadedState<Pick<State, 'management' | 'app'>>;
  /** `additionalMiddleware` should be used for testing only */
  additionalMiddleware?: Array<Middleware<{}, State, Dispatch<AppAction | Immutable<AppAction>>>>;
}

export const createFleetContextReduxStore = ({
  coreStart,
  depsStart,
  reducersObject = {
    management: managementReducer,
    app: appReducer,
  },
  preloadedState = {
    // @ts-expect-error TS2322
    management: undefined,
    // @ts-expect-error TS2322
    app: {
      enableExperimental: ExperimentalFeaturesService.get(),
    },
  },
  additionalMiddleware = [],
}: CreateFleetContextReduxStoreProps) => {
  // Most of the code here was copied form
  // x-pack/plugins/security_solution/public/management/index.ts
  return createStore(
    combineReducers(reducersObject),
    preloadedState,
    composeEnhancers(
      applyMiddleware(...managementMiddlewareFactory(coreStart, depsStart), ...additionalMiddleware)
    )
  );
};
