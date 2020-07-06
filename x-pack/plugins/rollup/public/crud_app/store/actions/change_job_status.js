/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  startJobs as sendStartJobsRequest,
  stopJobs as sendStopJobsRequest,
  createNoticeableDelay,
  showApiError,
} from '../../services';

import { UPDATE_JOB_START, UPDATE_JOB_SUCCESS, UPDATE_JOB_FAILURE } from '../action_types';

import { refreshJobs } from './refresh_jobs';

export const startJobs = (jobIds) => async (dispatch) => {
  dispatch({
    type: UPDATE_JOB_START,
  });

  try {
    await createNoticeableDelay(sendStartJobsRequest(jobIds));
  } catch (error) {
    dispatch({
      type: UPDATE_JOB_FAILURE,
    });

    return showApiError(
      error,
      i18n.translate('xpack.rollupJobs.startJobsAction.errorTitle', {
        defaultMessage: 'Error starting rollup jobs',
      })
    );
  }

  dispatch({
    type: UPDATE_JOB_SUCCESS,
  });

  dispatch(refreshJobs());
};

export const stopJobs = (jobIds) => async (dispatch) => {
  dispatch({
    type: UPDATE_JOB_START,
  });

  try {
    await createNoticeableDelay(sendStopJobsRequest(jobIds));
  } catch (error) {
    dispatch({
      type: UPDATE_JOB_FAILURE,
    });

    return showApiError(
      error,
      i18n.translate('xpack.rollupJobs.stopJobsAction.errorTitle', {
        defaultMessage: 'Error stopping rollup jobs',
      })
    );
  }

  dispatch({
    type: UPDATE_JOB_SUCCESS,
  });

  dispatch(refreshJobs());
};
