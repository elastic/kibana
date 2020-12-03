/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType, memo } from 'react';
import { CoreStart } from 'kibana/public';
import { combineReducers, createStore, compose, applyMiddleware } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { StartPlugins } from '../../../../../types';
import { managementReducer } from '../../../../store/reducer';
import { managementMiddlewareFactory } from '../../../../store/middleware';

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
        }),
        { management: undefined },
        composeEnhancers(applyMiddleware(...managementMiddlewareFactory(coreStart, depsStart)))
      );
    }

    return (
      <ReduxStoreProvider store={store}>
        <WrappedComponent {...props} />
      </ReduxStoreProvider>
    );
  });
};
