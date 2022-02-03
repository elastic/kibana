/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, PayloadAction } from '@reduxjs/toolkit';
import { LensStoreDeps } from '..';
import { loadInitial as loadInitialAction } from '..';
import { loadInitial } from './load_initial';

export const initMiddleware = (storeDeps: LensStoreDeps) => (store: MiddlewareAPI) => {
  return (next: Dispatch) => (action: PayloadAction) => {
    if (loadInitialAction.match(action)) {
      return loadInitial(store, storeDeps, action.payload);
    }
    next(action);
  };
};
