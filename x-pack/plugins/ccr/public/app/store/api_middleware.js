/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from './action_types';
import { apiStart, apiEnd, apiError } from './actions/api';

const apiMiddleware = ({ dispatch }) => next => async (action) => {
  next(action);

  if (action.type !== t.API) {
    return;
  }

  const { label, handler } = action.payload;

  dispatch(apiStart(label));

  let response;

  try {
    response = await handler();
  } catch(error) {
    dispatch(apiError(error));
    dispatch({
      type: `${label}_FAILURE`,
      payload: error
    });
    return;
  }

  dispatch({
    type: `${label}_SUCCESS`,
    payload: response
  });
  dispatch(apiEnd(label));
};

export default apiMiddleware;
