/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore, getDefaultMiddleware, DeepPartial } from '@reduxjs/toolkit';
import logger from 'redux-logger';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { lensSlice, initialState } from './lens_slice';
import { timeRangeMiddleware } from './time_range_middleware';
import { optimizingMiddleware } from './optimizing_middleware';
import { LensAppState, LensState, StoreDeps } from './types';
import { getInitialDatasourceId, getResolvedDateRange } from '../utils';
import { initMiddleware } from './init_middleware';
export * from './types';

export const reducer = {
  lens: lensSlice.reducer,
};

export const {
  loadInitial,
  navigateAway,
  setState,
  setSaveable,
  onActiveDataChange,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  updateLayer,
  switchVisualization,
  selectSuggestion,
  rollbackSuggestion,
  submitSuggestion,
  switchDatasource,
  setToggleFullscreen,
} = lensSlice.actions;

export const getPreloadedState = (
  {
    lensServices: { data },
    initialContext,
    embeddableEditorIncomingState,
    datasourceMap,
    visualizationMap,
  }: StoreDeps,
  preloadedState: Partial<LensAppState>
) => {
  const initialDatasourceId = getInitialDatasourceId(datasourceMap);
  const datasourceStates: LensAppState['datasourceStates'] = {};
  if (initialDatasourceId) {
    datasourceStates[initialDatasourceId] = {
      state: null,
      isLoading: true,
    };
  }

  const state = {
    lens: {
      ...initialState,
      isLoading: true,
      query: data.query.queryString.getQuery(),
      // Do not use app-specific filters from previous app,
      // only if Lens was opened with the intention to visualize a field (e.g. coming from Discover)
      filters: !initialContext
        ? data.query.filterManager.getGlobalFilters()
        : data.query.filterManager.getFilters(),
      searchSessionId: data.search.session.getSessionId(),
      resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
      isLinkedToOriginatingApp: Boolean(embeddableEditorIncomingState?.originatingApp),
      activeDatasourceId: initialDatasourceId,
      datasourceStates,
      visualization: {
        state: null as unknown,
        activeId: Object.keys(visualizationMap)[0] || null,
      },
      ...preloadedState,
    },
  } as DeepPartial<LensState>;
  return state;
};

export const makeConfigureStore = (storeDeps: StoreDeps, preloadedState: Partial<LensAppState>) => {
  const middleware = [
    ...getDefaultMiddleware({
      serializableCheck: false,
    }),
    initMiddleware(storeDeps),
    optimizingMiddleware(),
    timeRangeMiddleware(storeDeps.lensServices.data),
  ];
  if (process.env.NODE_ENV === 'development') middleware.push(logger);

  return configureStore({
    reducer,
    middleware,
    preloadedState: getPreloadedState(storeDeps, preloadedState),
  });
};

export type LensRootStore = ReturnType<typeof makeConfigureStore>;

export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootState> = useSelector;
