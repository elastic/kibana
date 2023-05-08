/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import { diff } from 'jsondiffpatch';
import { recordUndoableStateChange, undoRedoActions } from './lens_slice';

export const stateHistoryMiddleware = () => (store: MiddlewareAPI) => {
  return (next: Dispatch) => (action: Action) => {
    if (undoRedoActions.some((testAction) => testAction.match(action))) {
      console.log(action.type);
      const prevState = store.getState();
      next(action);

      const change = diff(prevState, store.getState());
      console.log(change);

      if (change) {
        next(recordUndoableStateChange({ change }));
      }
    } else {
      next(action);
    }
  };
};
