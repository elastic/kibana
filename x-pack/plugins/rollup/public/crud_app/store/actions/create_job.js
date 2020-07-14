/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  createJob as sendCreateJobRequest,
  serializeJob,
  deserializeJob,
  getRouter,
} from '../../services';

import { startJobs } from './change_job_status';

import {
  CREATE_JOB_START,
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILURE,
  CLEAR_CREATE_JOB_ERRORS,
} from '../action_types';

import { getFatalErrors } from '../../../kibana_services';

export const createJob = (jobConfig) => async (dispatch) => {
  dispatch({
    type: CREATE_JOB_START,
  });

  let newJob;

  try {
    [newJob] = await Promise.all([
      sendCreateJobRequest(serializeJob(jobConfig)),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    if (error) {
      const { body } = error;
      const statusCode = error.statusCode || (body && body.statusCode);

      // Expect an error in the shape provided by http service.
      if (body) {
        // Some errors have statusCode directly available but some are under a data property.
        if (statusCode === 409) {
          return dispatch({
            type: CREATE_JOB_FAILURE,
            payload: {
              error: {
                message: i18n.translate(
                  'xpack.rollupJobs.createAction.jobIdAlreadyExistsErrorMessage',
                  {
                    defaultMessage: `A job with ID '{jobConfigId}' already exists.`,
                    values: { jobConfigId: jobConfig.id },
                  }
                ),
              },
            },
          });
        }

        return dispatch({
          type: CREATE_JOB_FAILURE,
          payload: {
            error: {
              message: i18n.translate('xpack.rollupJobs.createAction.failedDefaultErrorMessage', {
                defaultMessage: 'Request failed with a {statusCode} error. {message}',
                values: { statusCode, message: body.message },
              }),
              cause: body.cause,
            },
          },
        });
      }
    }

    // This error isn't an HTTP error, so let the fatal error screen tell the user something
    // unexpected happened.
    return getFatalErrors().add(
      error,
      i18n.translate('xpack.rollupJobs.createAction.errorTitle', {
        defaultMessage: 'Error creating rollup job',
      })
    );
  }

  const deserializedJob = deserializeJob(newJob);

  dispatch({
    type: CREATE_JOB_SUCCESS,
    payload: { job: deserializedJob },
  });

  if (jobConfig.startJobAfterCreation) {
    dispatch(startJobs([jobConfig.id]));
  }

  // This will open the new job in the detail panel. Note that we're *not* showing a success toast
  // here, because it would partially obscure the detail panel.
  getRouter().history.push({
    pathname: `/job_list`,
    search: `?job=${encodeURIComponent(jobConfig.id)}`,
  });
};

export const clearCreateJobErrors = () => (dispatch) => {
  dispatch({
    type: CLEAR_CREATE_JOB_ERRORS,
  });
};
