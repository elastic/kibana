/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store } from 'redux';
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import type { ResolverState, DataAccessLayer } from '../types';
import { resolverReducer } from './reducer';
import { resolverMiddlewareFactory } from './middleware';
import type { ResolverAction } from './actions';

export const resolverStoreFactory = (
  dataAccessLayer: DataAccessLayer
): Store<ResolverState, ResolverAction> => {
  const actionsDenylist: Array<ResolverAction['type']> = ['userMovedPointer'];
  const composeEnhancers = composeWithDevTools({
    name: 'Resolver',
    actionsBlacklist: actionsDenylist,
  });
  const middlewareEnhancer = applyMiddleware(resolverMiddlewareFactory(dataAccessLayer));

  return createStore(resolverReducer, composeEnhancers(middlewareEnhancer));
};
