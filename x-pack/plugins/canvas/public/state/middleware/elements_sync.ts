/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction, Dispatch, Middleware } from 'redux';

// @ts-expect-error
import { setExpressionAction, syncFilterWithExpression } from '../actions/elements';

export const elementsSyncMiddleware: Middleware =
  ({ dispatch }) =>
  (next: Dispatch) =>
  (action: AnyAction) => {
    if (action.type === setExpressionAction) {
      dispatch(syncFilterWithExpression(...Object.values(action.payload)));
    }

    next(action);
  };
