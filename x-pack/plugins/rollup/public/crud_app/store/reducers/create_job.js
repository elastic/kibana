/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLEAR_CREATE_JOB_ERRORS,
  CREATE_JOB_FAILURE,
  CREATE_JOB_START,
  CREATE_JOB_SUCCESS,
} from '../action_types';

const initialState = {
  isSaving: false,
  error: undefined,
};

export function createJob(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case CREATE_JOB_START:
      return {
        isSaving: true,
        error: undefined,
      };

    case CREATE_JOB_SUCCESS:
      return {
        ...state,
        isSaving: false,
      };

    case CREATE_JOB_FAILURE:
      return {
        ...state,
        error: payload.error,
        isSaving: false,
      };

    case CLEAR_CREATE_JOB_ERRORS:
      return {
        ...state,
        error: undefined,
      };

    default:
      return state;
  }
}
