/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction, Dispatch, Middleware } from 'redux';

import {
  setExpressionAction,
  setFilterAction,
  syncFilterWithExpression,
  syncExpressionWithFilter,
  // @ts-expect-error
} from '../actions/elements';

export const elementsSyncMiddleware: Middleware =
  ({ dispatch }) =>
  (next: Dispatch) =>
  (action: AnyAction) => {
    next(action);

    switch (action.type) {
      case setExpressionAction:
        if (action.payload.needSync) {
          dispatch(syncFilterWithExpression(...Object.values(action.payload)));
        }
        break;
      case setFilterAction:
        if (action.payload.needSync) {
          dispatch(syncExpressionWithFilter(...Object.values(action.payload)));
        }
        break;
    }
  };
