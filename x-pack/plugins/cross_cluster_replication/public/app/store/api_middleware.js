/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from './action_types';
import { apiEnd, apiError, apiStart }  from './actions/api';

export const apiMiddleware = ({ dispatch }) => next => async (action) => {
  next(action);

  if (action.type !== t.API) {
    return;
  }

  const { label, scope, handler } = action.payload;

  dispatch(apiStart({ label, scope }));

  let response;

  try {
    response = await handler();
  } catch (error) {
    dispatch(apiError({ error, scope }));
    dispatch({
      type: `${label}_FAILURE`,
      payload: error,
    });
    return;
  }

  dispatch({
    type: `${label}_SUCCESS`,
    payload: response,
  });
  dispatch(apiEnd({ label, scope }));
};
