/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { extractQueryParams, getRouter } from '../../services';
import { rollupJobsStore } from '..';
import { getJobByJobId, getJobsList } from '../selectors';
import { openDetailPanel, closeDetailPanel } from './detail_panel';

export const showDeepLinkedJob = () => async (dispatch) => {
  const state = rollupJobsStore.getState();
  const hasJobs = Boolean(getJobsList(state).length);

  if (!hasJobs) {
    return;
  }

  const search = getRouter().history.location.search;
  const { job: jobId } = extractQueryParams(search);

  if (!jobId) {
    return;
  }

  const jobExists = getJobByJobId(rollupJobsStore.getState(), jobId);

  if (!jobExists) {
    toastNotifications.addWarning(`Job ${jobId} doesn't exist`);
    dispatch(closeDetailPanel());
    return;
  }

  dispatch(openDetailPanel({ jobId }));
};
