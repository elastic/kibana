/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ActionCreator,
  configureStore,
  createListenerMiddleware,
  type ListenerEffectAPI,
} from '@reduxjs/toolkit';

import type { ListenerPredicate } from '@reduxjs/toolkit/dist/listenerMiddleware/types';
import { type selectDataView } from './actions';

import { reducer } from './reducer';

export const listenerMiddleware = createListenerMiddleware();

export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export type DatapickerActions = ReturnType<typeof selectDataView>;

// NOTE: types below exist because we are using redux-toolkit version lower than 2.x
// in v2, there are TS helpers that make it easy to setup overrides that are necessary here.
export interface ListenerOptions {
  // Match with a function accepting action and state. This is broken in v1.x,
  // the predicate is always required
  predicate?: ListenerPredicate<DatapickerActions, RootState>;
  // Match action by type
  type?: string;
  // Exact action type match based on the RTK action creator
  actionCreator?: ActionCreator<DatapickerActions>;
  // An effect to call
  effect: (
    action: DatapickerActions,
    api: ListenerEffectAPI<RootState, AppDispatch>
  ) => Promise<void>;
}

// NOTE: register side effect listeners
export const startAppListening = listenerMiddleware.startListening as unknown as (
  options: ListenerOptions
) => void;
