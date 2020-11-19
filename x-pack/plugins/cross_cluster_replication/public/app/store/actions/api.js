/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { API_STATUS } from '../../constants';

export const apiRequestStart = ({ label, scope, status = API_STATUS.LOADING }) => ({
  type: t.API_REQUEST_START,
  payload: { label, scope, status },
});

export const apiRequestEnd = ({ label, scope }) => ({
  type: t.API_REQUEST_END,
  payload: { label, scope },
});

export const setApiError = ({ error, scope }) => ({
  type: t.API_ERROR_SET,
  payload: { error, scope },
});

export const clearApiError = (scope) => ({
  type: t.API_ERROR_SET,
  payload: { error: null, scope },
});

export const sendApiRequest = ({
  label,
  scope,
  status,
  handler,
  onSuccess = () => undefined,
  onError = () => undefined,
}) => async (dispatch, getState) => {
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
