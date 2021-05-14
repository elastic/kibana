/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { useDispatch, useSelector } from 'react-redux';
import { appSlice } from './app_slice';
import { customMiddleware } from './custom_middleware';
export * from './types';

export const reducer = {
  app: appSlice.reducer,
};

export const {
  startSession,
  setFilters,
  setQuery,
  setState,
  setStateM,
  navigateAway,
} = appSlice.actions;

export const makeConfigureStore = (preloadedState, { data }) =>
  configureStore({
    reducer,
    middleware: [
      ...getDefaultMiddleware({
        serializableCheck: {
          ignoredPaths: [
            'app.indexPatternsForTopNav',
            'payload.indexPatternsForTopNav',
            'app.indexPatterns',
            'payload.indexPatterns',
            'app.filters',
          ],
          ignoredActions: ['app/setState'],
        },
      }),
      logger,
      customMiddleware(data),
    ],
    preloadedState,
  });

// export type LensRootStore = ReturnType<typeof lensStore.getState>;
// export type LensDispatch = typeof lensStore.dispatch;

// export const useLensDispatch = () => useDispatch<LensDispatch>();
// export const useLensSelector: TypedUseSelectorHook<LensRootStore> = useSelector;

export const useLensDispatch = () => useDispatch();
export const useLensSelector = useSelector;
