/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { loadJobs as sendLoadJobsRequest, deserializeJobs } from '../../services';
import {
  REFRESH_JOBS_SUCCESS,
} from '../action_types';

export const refreshJobs = () => async (dispatch) => {
  let jobs;
  try {
    jobs = await sendLoadJobsRequest();
  } catch (error) {
    return toastNotifications.addWarning(error.data.message);
  }

  dispatch({
    type: REFRESH_JOBS_SUCCESS,
    payload: { jobs: deserializeJobs(jobs) }
  });
};
