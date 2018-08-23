/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { startJobs as sendStartJobsRequest } from '../../services';
import { loadJobs } from './load_jobs';

export const startJobsSuccess = createAction('START_JOBS_SUCCESS');
export const startJobs = (jobIds) => async (dispatch) => {
  try {
    await sendStartJobsRequest(jobIds);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(startJobsSuccess());
  dispatch(loadJobs());
};
