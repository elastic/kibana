/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CLONE_JOB_START, CLONE_JOB_CLEAR } from '../action_types';

const initialState = {
  job: undefined,
};

export function cloneJob(state = initialState, action) {
  const { type, payload } = action;

  if (type === CLONE_JOB_START) {
    return { job: payload };
  }

  if (type === CLONE_JOB_CLEAR) {
    return { ...initialState };
  }

  return state;
}
