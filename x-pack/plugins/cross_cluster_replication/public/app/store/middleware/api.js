/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { apiRequestStart, apiRequestEnd, setApiError, clearApiError }  from '../actions/api';

export const apiMiddleware = ({ dispatch, getState }) => next => async (action) => {
  next(action);

  if (action.type !== t.API) {
    return;
  }

  const { label, scope, status, handler, onSuccess, onError } = action.payload;

  dispatch(clearApiError(scope));
  dispatch(apiRequestStart({ label, scope, status }));

  try {
    const response = await handler(dispatch);

    dispatch(apiRequestEnd({ label, scope }));
    dispatch({ type: `${label}_SUCCESS`, payload: response });

    onSuccess(response, dispatch, getState);

  } catch (error) {
    dispatch(apiRequestEnd({ label, scope }));
    dispatch(setApiError({ error, scope }));
    dispatch({ type: `${label}_FAILURE`, payload: error });

    onError(error, dispatch, getState);
  }
};
