/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import { compare } from 'fast-json-patch';
import { recordReversibleStateChange, undoRedoActions } from './lens_slice';
import { StateCoordinator } from './state_coordinator';
import { StateChangeOperation } from './types';

export const stateHistoryMiddleware =
  () => (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    if (undoRedoActions.some((testAction) => testAction.match(action))) {
      const prevState = store.getState().lens;

      next(action);

      const newState = store.getState().lens;

      const change: StateChangeOperation = {
        forward: compare(prevState, newState),
        backward: compare(newState, prevState),
      };

      next(recordReversibleStateChange({ change }));

      StateCoordinator.sendPatch(change.forward);
    } else {
      next(action);
    }
  };
