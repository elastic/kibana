/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { AppMountContext } from 'kibana/public';
import { sagaMiddleware } from './lib/saga';
import reducers from './reducers';
import saga from './sagas';

export function storeFactory(context: AppMountContext) {
  const middlewares = [sagaMiddleware(saga(context))];
  return createStore(reducers, undefined, composeWithDevTools(applyMiddleware(...middlewares)));
}
