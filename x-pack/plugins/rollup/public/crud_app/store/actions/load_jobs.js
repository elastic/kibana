/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { loadJobs as sendLoadJobsRequest, deserializeJobs } from '../../services';

export const clearJobs = createAction('CLEAR_JOBS');

export const loadJobsSuccess = createAction('LOAD_JOBS_SUCCESS');
export const loadJobsFailure = createAction('LOAD_JOBS_FAILURE');

export const loadJobs = () => async (dispatch) => {
  let jobs;
  try {
    jobs = await sendLoadJobsRequest();
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(loadJobsSuccess({ jobs: deserializeJobs(jobs) }));
};
