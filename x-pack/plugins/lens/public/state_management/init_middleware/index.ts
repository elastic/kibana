/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, PayloadAction } from '@reduxjs/toolkit';
import { LensStoreDeps } from '..';
import { lensSlice } from '../lens_slice';
import { loadInitial } from './load_initial';
import { subscribeToExternalContext } from './subscribe_to_external_context';

export const initMiddleware = (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => {
  const unsubscribeFromExternalContext = subscribeToExternalContext(
    storeDeps.lensServices.data,
    store.getState,
    store.dispatch
  );
  return (next: Dispatch) => (action: PayloadAction) => {
    if (lensSlice.actions.loadInitial.match(action)) {
      return loadInitial(
        store,
        storeDeps,
        action.payload.redirectCallback,
        action.payload.initialInput
      );
    } else if (lensSlice.actions.navigateAway.match(action)) {
      return unsubscribeFromExternalContext();
    }
    next(action);
  };
};
