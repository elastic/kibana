/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/public';
import { EnhancerOptions } from 'redux-devtools-extension';

export const withReduxDevTools = <StateContainer extends ReduxLikeStateContainer<any>>(
  stateContainer: StateContainer,
  config?: EnhancerOptions
): StateContainer => {
  if (process.env.NODE_ENV !== 'production' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    const devToolsExtension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;

    const devToolsInstance = devToolsExtension.connect(config);

    devToolsInstance.init(stateContainer.getState());

    stateContainer.addMiddleware(({ getState }) => (next) => (action) => {
      devToolsInstance.send(action, getState());
      return next(action);
    });
  }

  return stateContainer;
};
