/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, PayloadAction } from '@reduxjs/toolkit';
import { LensStoreDeps } from '..';
import { loadInitial as loadInitialAction, navigateAway } from '..';
import { loadInitial } from './load_initial';
import { subscribeToExternalContext } from './subscribe_to_external_context';

export const initMiddleware = (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => {
  const unsubscribeFromExternalContext = subscribeToExternalContext(
    storeDeps.lensServices.data,
    store.getState,
    store.dispatch
  );
  return (next: Dispatch) => (action: PayloadAction) => {
    if (loadInitialAction.match(action)) {
      return loadInitial(store, storeDeps, action.payload);
    } else if (navigateAway.match(action)) {
      return unsubscribeFromExternalContext();
    }
    next(action);
  };
};
