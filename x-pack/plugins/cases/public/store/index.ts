/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createStore, combineReducers } from 'redux';
import { addToCaseReducer } from './reducer';

const reducer = combineReducers({
  addToCase: addToCaseReducer,
});

export const reduxStore = createStore(reducer);

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
export type AppStore = typeof reduxStore;
