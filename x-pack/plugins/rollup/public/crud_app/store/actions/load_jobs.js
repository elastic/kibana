/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { loadJobs as request, deserializeJobs } from '../../services';

export const loadJobsSuccess = createAction('LOAD_JOBS_SUCCESS');
export const loadJobs = () => async (dispatch) => {
  let jobs;
  try {
    jobs = await request();
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(loadJobsSuccess({ jobs: deserializeJobs(jobs) }));
};
