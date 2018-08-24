/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { CRUD_APP_BASE_PATH } from '../../../../common';
import { createJob as sendCreateJobRequest, serializeJob, getRouter } from '../../services';

export const createJobSuccess = createAction('CREATE_JOB_SUCCESS');
export const createJob = (jobConfig) => async (dispatch) => {
  try {
    await sendCreateJobRequest(serializeJob(jobConfig));
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  // This will open the new job in the detail panel.
  getRouter().history.push({
    pathname: CRUD_APP_BASE_PATH,
    search: `?job=${jobConfig.id}`,
  });

  toastNotifications.addSuccess(`Rollup job '${jobConfig.id}' was created`);
  dispatch(createJobSuccess());
};
