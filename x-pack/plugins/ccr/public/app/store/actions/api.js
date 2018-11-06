/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';

export const apiStart = (label) => ({
  type: t.API_START,
  payload: label
});

export const apiEnd = (label) => ({
  type: t.API_END,
  payload: label
});

export const apiError = (error, scope) => ({
  type: t.API_ERROR,
  payload: { error, scope }
});

export const apiAction = (
  {
    label,
    handler,
  }) => ({
  type: t.API,
  payload: {
    label,
    handler,
  }
});
