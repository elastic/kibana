/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CLONE_JOB_START, CLONE_JOB_CLEAR } from '../action_types';

export const cloneJob = (jobToClone) => (dispatch) => {
  dispatch({
    type: CLONE_JOB_START,
    payload: jobToClone,
  });
};

export const clearCloneJob = () => (dispatch) => {
  dispatch({
    type: CLONE_JOB_CLEAR,
  });
};
