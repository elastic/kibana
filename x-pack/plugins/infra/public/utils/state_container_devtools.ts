/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/public';
import { EnhancerOptions } from 'redux-devtools-extension';
import { getReduxDevtools, hasReduxDevtools, isDevMode } from './dev_mode';

export const withReduxDevTools = <StateContainer extends ReduxLikeStateContainer<any>>(
  stateContainer: StateContainer,
  config?: EnhancerOptions
): StateContainer => {
  if (isDevMode() && hasReduxDevtools()) {
    const devToolsExtension = getReduxDevtools();

    const devToolsInstance = devToolsExtension.connect({
      ...config,
      serialize: {
        ...(typeof config?.serialize === 'object' ? config.serialize : {}),
        replacer: (_key: string, value: unknown) => replaceReactSyntheticEvent(value),
      },
      features: {
        lock: false,
        persist: false,
        import: false,
        jump: false,
        skip: false,
        reorder: false,
        dispatch: false,
        ...config?.features,
      },
    });

    devToolsInstance.init(stateContainer.getState());

    stateContainer.addMiddleware(({ getState }) => (next) => (action) => {
      devToolsInstance.send(action, getState());
      return next(action);
    });
  }

  return stateContainer;
};

const isReactSyntheticEvent = (value: unknown) =>
  typeof value === 'object' && value != null && (value as any).nativeEvent instanceof Event;

const replaceReactSyntheticEvent = (value: unknown) =>
  isReactSyntheticEvent(value) ? '[ReactSyntheticEvent]' : value;
