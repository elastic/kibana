/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, memo } from 'react';
import { CoreStart } from 'kibana/public';
import { combineReducers, createStore, compose, applyMiddleware } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { CurrentLicense } from '../../../../../common/components/current_license';
import { StartPlugins } from '../../../../../types';
import { managementReducer } from '../../../../store/reducer';
import { managementMiddlewareFactory } from '../../../../store/middleware';
import { appReducer } from '../../../../../common/store/app';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import { SecuritySolutionStartDependenciesContext } from '../../../../../common/components/user_privileges/endpoint/security_solution_start_dependencies';
import { ReactQueryClientProvider } from '../../../../../common/containers/query_client/query_client_provider';

type ComposeType = typeof compose;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: ComposeType;
  }
}
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

interface WithSecurityContextProps<P extends {}> {
  coreStart: CoreStart;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  WrappedComponent: ComponentType<P>;
}

/**
 * Returns a new component that wraps the provided `WrappedComponent` in a bare minimum set of rendering context
 * needed to render Security Solution components that may be dependent on a Redux store and/or Security Solution
 * specific context based functionality
 *
 * @param coreStart
 * @param depsStart
 * @param WrappedComponent
 */
export const withSecurityContext = <P extends {}>({
  coreStart,
  depsStart,
  WrappedComponent,
}: WithSecurityContextProps<P>): ComponentType<P> => {
  let store: ReturnType<typeof createStore>; // created on first render

  return memo((props) => {
    if (!store) {
      // Most of the code here was copied form
      // x-pack/plugins/security_solution/public/management/index.ts
      store = createStore(
        combineReducers({
          management: managementReducer,
          app: appReducer,
        }),
        {
          management: undefined,
          // ignore this error as we just need the enableExperimental and it's temporary
          // @ts-expect-error TS2739
          app: {
            enableExperimental: ExperimentalFeaturesService.get(),
          },
        },
        composeEnhancers(applyMiddleware(...managementMiddlewareFactory(coreStart, depsStart)))
      );
    }

    return (
      <ReduxStoreProvider store={store}>
        <ReactQueryClientProvider>
          <SecuritySolutionStartDependenciesContext.Provider value={depsStart}>
            <CurrentLicense>
              <WrappedComponent {...props} />
            </CurrentLicense>
          </SecuritySolutionStartDependenciesContext.Provider>
        </ReactQueryClientProvider>
      </ReduxStoreProvider>
    );
  });
};
