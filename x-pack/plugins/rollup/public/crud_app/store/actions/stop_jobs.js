/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { stopJobs as sendStopJobsRequest } from '../../services';
import { loadJobs } from './load_jobs';

export const stopJobsSuccess = createAction('STOP_JOBS_SUCCESS');
export const stopJobs = (jobIds) => async (dispatch) => {
  try {
    await sendStopJobsRequest(jobIds);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(stopJobsSuccess());
  dispatch(loadJobs());
};
