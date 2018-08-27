/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const initialState = {
  isSaving: false,
  error: undefined,
};

export function createJob(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case 'CREATE_JOB_START':
      return { isSaving: true, error: undefined };

    case 'CREATE_JOB_COMPLETE':
      return { ...state, isSaving: false };

    case 'CREATE_JOB_FAILURE':
      return { ...state, error: payload.error };

    default:
      return state;
  }
}
