/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { createJob as sendCreateJobRequest, serializeJob } from '../../services';

export const createJobSuccess = createAction('CREATE_JOB_SUCCESS');
export const createJob = (jobConfig) => async (dispatch) => {
  try {
    await sendCreateJobRequest(serializeJob(jobConfig));
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch(createJobSuccess());
};
