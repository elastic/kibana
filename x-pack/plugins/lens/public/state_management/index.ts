/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { VisualizeFieldContext } from 'src/plugins/ui_actions/public';
import { appSlice } from './app_slice';
import { customMiddleware } from './custom_middleware';

import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
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

export const getPreloadedState = ({
  data,
  initialContext = undefined,
  isLinkedToOriginatingApp = false,
}: {
  data: DataPublicPluginStart;
  initialContext: VisualizeFieldContext | undefined;
  isLinkedToOriginatingApp: boolean;
}) => {
  return {
    app: {
      query: data.query.queryString.getQuery(),
      // Do not use app-specific filters from previous app,
      // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
      filters: !initialContext
        ? data.query.filterManager.getGlobalFilters()
        : data.query.filterManager.getFilters(),
      searchSessionId: data.search.session.start(),

      indexPatternsForTopNav: [],
      isSaveable: false,
      isAppLoading: false,
      isLinkedToOriginatingApp,
    },
  };
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
// export type LensDispatch = typeof lensStore.dispatch;

export type LensDispatch = ReturnType<typeof makeConfigureStore>['dispatch'];
export type LensGetState = ReturnType<typeof makeConfigureStore>['getState'];

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootStore> = useSelector;
