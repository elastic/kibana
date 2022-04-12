/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStore, applyMiddleware } from 'redux';
import type { Store } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import createSagaMiddleware from 'redux-saga';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { rootEffect } from './effects';
import { rootReducer } from './reducers';

export type AppState = ReturnType<typeof rootReducer>;

const sagaMW = createSagaMiddleware();

export const store: Store = createStore(rootReducer, composeWithDevTools(applyMiddleware(sagaMW)));

sagaMW.run(rootEffect);

export const storage = new Storage(window.localStorage);
