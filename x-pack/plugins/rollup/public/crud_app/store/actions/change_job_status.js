/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import {
  startJobs as sendStartJobsRequest,
  stopJobs as sendStopJobsRequest,
} from '../../services';

import {
  UPDATE_JOB_START,
  UPDATE_JOB_SUCCESS,
  UPDATE_JOB_FAILURE,
} from '../action_types';

import { refreshJobs } from './refresh_jobs';

export const startJobs = (jobIds) => async (dispatch) => {
  dispatch({
    type: UPDATE_JOB_START,
  });

  try {
    await sendStartJobsRequest(jobIds);
  } catch (error) {
    dispatch({
      type: UPDATE_JOB_FAILURE,
    });

    return toastNotifications.addDanger(error.data.message);
  }

  dispatch({
    type: UPDATE_JOB_SUCCESS,
  });

  dispatch(refreshJobs());
};

export const stopJobs = (jobIds) => async (dispatch) => {
  try {
    await sendStopJobsRequest(jobIds);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(refreshJobs());
};
