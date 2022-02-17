/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import { isEqual } from 'lodash';
import { onActiveDataChange } from '.';

/** cancels updates to the store that don't change the state */
export const optimizingMiddleware = () => (store: MiddlewareAPI) => {
  return (next: Dispatch) => (action: Action) => {
    if (onActiveDataChange.match(action)) {
      if (isEqual(store.getState().lens.activeData, action.payload)) {
        return;
      }
    }
    next(action);
  };
};
