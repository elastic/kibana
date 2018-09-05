/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';

import { deleteJobs as sendDeleteJobsRequest } from '../../services';
import { DELETE_JOBS_SUCCESS } from '../action_types';
import { getDetailPanelJob } from '../selectors';

import { loadJobs } from './load_jobs';
import { closeDetailPanel } from './detail_panel';

export const deleteJobs = (jobIds) => async (dispatch, getState) => {
  try {
    await sendDeleteJobsRequest(jobIds);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  dispatch({
    type: DELETE_JOBS_SUCCESS,
  });

  dispatch(loadJobs());

  // If we've just deleted a job we were looking at, we need to close the panel.
  const detailPanelJob = getDetailPanelJob(getState());
  if (detailPanelJob && jobIds.includes(detailPanelJob.id)) {
    dispatch(closeDetailPanel());
  }
};
