/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';

import { deleteJobs as sendDeleteJobsRequest } from '../../services';
import { getDetailPanelJob } from '../selectors';

import { loadJobs } from './load_jobs';
import { closeDetailPanel } from './detail_panel';

export const deleteJobs = (jobIds) => async (dispatch, getState) => {
  try {
    await sendDeleteJobsRequest(jobIds);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }

  if (jobIds.length === 1) {
    toastNotifications.addSuccess(`Rollup job '${jobIds[0]}' was deleted`);
  } else {
    toastNotifications.addSuccess(`${jobIds.length} rollup jobs were deleted`);
  }

  dispatch(loadJobs());

  // If we've just deleted a job we were looking at, we need to close the panel.
  const detailPanelJob = getDetailPanelJob(getState());
  if (detailPanelJob && jobIds.includes(detailPanelJob.id)) {
    dispatch(closeDetailPanel());
  }
};
