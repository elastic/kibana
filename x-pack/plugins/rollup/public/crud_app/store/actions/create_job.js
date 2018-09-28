/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';

import { CRUD_APP_BASE_PATH } from '../../constants';
import {
  createJob as sendCreateJobRequest,
  serializeJob,
  deserializeJob,
  getRouter,
} from '../../services';

import {
  CREATE_JOB_START,
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILURE,
  CLEAR_CREATE_JOB_ERRORS,
} from '../action_types';

export const createJob = (jobConfig) => async (dispatch) => {
  dispatch({
    type: CREATE_JOB_START,
  });

  let newJob;

  try {
    [ newJob ] = await Promise.all([
      sendCreateJobRequest(serializeJob(jobConfig)),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    const { statusCode, data } = error;

    // Some errors have statusCode directly available but some are under a data property.
    switch (statusCode || data.statusCode) {
      case 409:
        dispatch({
          type: CREATE_JOB_FAILURE,
          payload: {
            error: {
              message: `A job with ID '${jobConfig.id}' already exists.`,
            },
          },
        });
        break;

      default:
        dispatch({
          type: CREATE_JOB_FAILURE,
          payload: {
            error: {
              message: `Request failed with a ${statusCode} error. ${data.message}`,
              cause: data.cause,
            },
          },
        });
    }

    return;
  }

  toastNotifications.addSuccess(`Rollup job '${jobConfig.id}' was created`);

  dispatch({
    type: CREATE_JOB_SUCCESS,
    payload: { job: deserializeJob(newJob.data) },
  });

  // This will open the new job in the detail panel.
  getRouter().history.push({
    pathname: CRUD_APP_BASE_PATH,
    search: `?job=${jobConfig.id}`,
  });
};

export const clearCreateJobErrors = () => (dispatch) => {
  dispatch({
    type: CLEAR_CREATE_JOB_ERRORS,
  });
};
