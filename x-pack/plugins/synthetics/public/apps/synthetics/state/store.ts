/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { rootEffect } from './root_effect';
import { rootReducer } from './root_reducer';

const sagaMW = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: false }).concat(sagaMW),
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: {},
  enhancers: [],
});

sagaMW.run(rootEffect);

export const storage = new Storage(window.localStorage);
