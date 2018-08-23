/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { CRUD_APP_BASE_PATH } from '../../../../common';
import { createJob as sendCreateJobRequest, serializeJob, getRouter } from '../../services';
// import { openDetailPanel } from './detail_panel';

export const createJobSuccess = createAction('CREATE_JOB_SUCCESS');
export const createJob = (jobConfig) => async (dispatch) => {
  try {
    await sendCreateJobRequest(serializeJob(jobConfig));
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  toastNotifications.addSuccess(`Rollup job '${jobConfig.id}' was created`);
  getRouter().history.push(CRUD_APP_BASE_PATH);
  dispatch(createJobSuccess());
  // TODO: display the new job in the detail panel
  // dispatch(openDetailPanel({ job }));
};
