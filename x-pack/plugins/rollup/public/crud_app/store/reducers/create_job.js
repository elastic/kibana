/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CREATE_JOB_START,
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILURE,
} from '../action_types';

const initialState = {
  isSaving: false,
  error: undefined,
};

export function createJob(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case CREATE_JOB_START:
      return { isSaving: true, error: undefined };

    case CREATE_JOB_SUCCESS:
      return { ...state, isSaving: false };

    case CREATE_JOB_FAILURE:
      return { ...state, error: payload.error, isSaving: false };

    default:
      return state;
  }
}
