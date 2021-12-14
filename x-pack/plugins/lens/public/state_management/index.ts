/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore, getDefaultMiddleware, Middleware, PreloadedState } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { makeLensReducer, lensActions } from './lens_slice';
import { timeRangeMiddleware } from './time_range_middleware';
import { optimizingMiddleware } from './optimizing_middleware';
import { LensState, LensStoreDeps } from './types';
import { initMiddleware } from './init_middleware';
import { DiffLoggerWindow } from './diff_logger';
export * from './types';
export * from './selectors';

export const {
  loadInitial,
  navigateAway,
  setState,
  setSaveable,
  onActiveDataChange,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  insertLayer,
  switchVisualization,
  rollbackSuggestion,
  submitSuggestion,
  switchDatasource,
  setToggleFullscreen,
  initEmpty,
  editVisualizationAction,
  removeLayers,
  removeOrClearLayer,
  addLayer,
  setLayerDefaultDimension,
} = lensActions;

let loggerWindow: DiffLoggerWindow;

const diffLogger: Middleware = (store) => (next) => (action) => {
  const prevState = store.getState();
  const result = next(action);
  if (
    (window as unknown as Window & { ELASTIC_LENS_DIFF_LOGGER: boolean }).ELASTIC_LENS_DIFF_LOGGER
  ) {
    if (!loggerWindow) {
      loggerWindow = new DiffLoggerWindow();
    }

    loggerWindow.printDiff({
      actionType: action.type,
      prev: prevState,
      next: store.getState(),
    });
  }
  return result;
};

export const makeConfigureStore = (
  storeDeps: LensStoreDeps,
  preloadedState: PreloadedState<LensState>
) => {
  const middleware = [
    ...getDefaultMiddleware({
      serializableCheck: false,
    }),
    initMiddleware(storeDeps),
    optimizingMiddleware(),
    timeRangeMiddleware(storeDeps.lensServices.data),
  ];
  if (process.env.NODE_ENV === 'development') {
    middleware.push(
      createLogger({
        // @ts-ignore
        predicate: () => window.ELASTIC_LENS_LOGGER,
      })
    );
    middleware.push(diffLogger);
  }

  return configureStore({
    reducer: {
      lens: makeLensReducer(storeDeps),
    },
    middleware,
    preloadedState,
  });
};

type Awaited<T> = T extends PromiseLike<infer U> ? U : T; // TODO - use built-in when we get to TS 4.5
export type LensRootStore = Awaited<ReturnType<typeof makeConfigureStore>>;

export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootState> = useSelector;
