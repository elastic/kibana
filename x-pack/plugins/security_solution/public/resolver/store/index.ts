/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, applyMiddleware, Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { ResolverAction, ResolverState } from '../types';
import { StartServices } from '../../types';
import { resolverReducer } from './reducer';
import { resolverMiddlewareFactory } from './middleware';

export const storeFactory = (
  context?: KibanaReactContextValue<StartServices>
): { store: Store<ResolverState, ResolverAction> } => {
  const actionsBlacklist: Array<ResolverAction['type']> = ['userMovedPointer'];
  const composeEnhancers = composeWithDevTools({
    name: 'Resolver',
    actionsBlacklist,
  });
  const middlewareEnhancer = applyMiddleware(resolverMiddlewareFactory(context));

  const store = createStore(resolverReducer, composeEnhancers(middlewareEnhancer));
  return {
    store,
  };
};
