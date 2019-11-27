/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, applyMiddleware } from 'redux';
import { History } from 'history';
import { composeWithDevTools } from 'redux-devtools-extension';
import { AppMountContext } from 'kibana/public';
import { createSagaMiddleware } from './lib/saga';
import reducers from './reducers';
import saga from './sagas';

export function storeFactory(context: AppMountContext, history: History) {
  const sagaMiddleware = createSagaMiddleware(saga(context, history));
  const middlewares = [sagaMiddleware];
  const store = createStore(reducers, {}, composeWithDevTools(applyMiddleware(...middlewares)));
  sagaMiddleware.run();
  return store;
}
