/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { EuiCode } from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../../common';
import {
  createJob as sendCreateJobRequest,
  serializeJob,
  deserializeJob,
  getRouter,
} from '../../services';

export const createJobStart = createAction('CREATE_JOB_START');
export const createJobSuccess = createAction('CREATE_JOB_SUCCESS');
export const createJobFailure = createAction('CREATE_JOB_FAILURE');

export const createJob = (jobConfig) => async (dispatch) => {
  dispatch(createJobStart());

  let newJob;

  try {
    [ newJob ] = await Promise.all([
      sendCreateJobRequest(serializeJob(jobConfig)),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    const { status, data } = error;

    switch (status) {
      case 409:
        dispatch(createJobFailure({ error: `A job named '${jobConfig.id}' already exists.` }));
        break;

      default:
        toastNotifications.addDanger({
          title: <EuiCode>{status}</EuiCode>,
          text: data.message,
        });
    }

    return;
  }

  toastNotifications.addSuccess(`Rollup job '${jobConfig.id}' was created`);
  dispatch(createJobSuccess({ job: deserializeJob(newJob.data) }));

  // This will open the new job in the detail panel.
  getRouter().history.push({
    pathname: CRUD_APP_BASE_PATH,
    search: `?job=${jobConfig.id}`,
  });
};
