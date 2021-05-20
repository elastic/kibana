/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { appSlice, initialState } from './app_slice';
import { customMiddleware } from './custom_middleware';

import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { LensAppState } from './types';
export * from './types';

export const reducer = {
  app: appSlice.reducer,
};

export const { setState, navigateAway, onChangeFromEditorFrame } = appSlice.actions;

export const getPreloadedState = (initializedState: Partial<LensAppState>) => {
  const state = {
    app: {
      ...initialState,
      ...initializedState,
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return state;
};

type PreloadedState = ReturnType<typeof getPreloadedState>;

export const makeConfigureStore = (
  preloadedState: PreloadedState,
  { data }: { data: DataPublicPluginStart }
) => {
  const middleware = [
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
    customMiddleware(data),
  ];
  if (process.env.NODE_ENV === 'development') middleware.push(logger);

  return configureStore({
    reducer,
    middleware,
    preloadedState,
  });
};

export type LensRootStore = ReturnType<typeof makeConfigureStore>;

export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootState> = useSelector;
