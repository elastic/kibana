/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import { compare } from 'fast-json-patch';
import { recordUndoableStateChange, undoRedoActions } from './lens_slice';

export const stateHistoryMiddleware = () => (store: MiddlewareAPI) => {
  return (next: Dispatch) => (action: Action) => {
    if (undoRedoActions.some((testAction) => testAction.match(action))) {
      const prevState = store.getState();
      next(action);

      next(recordUndoableStateChange({ patch: compare(store.getState().lens, prevState.lens) }));
    } else {
      next(action);
    }
  };
};
