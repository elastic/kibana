/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { deleteJobs as sendDeleteJobsRequest } from '../../services';
import { loadJobs } from './load_jobs';

export const deleteJobsSuccess = createAction('DELETE_JOBS_SUCCESS');
export const deleteJobs = (jobIds) => async (dispatch) => {
  try {
    await sendDeleteJobsRequest(jobIds);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(deleteJobsSuccess());
  dispatch(loadJobs());
};
