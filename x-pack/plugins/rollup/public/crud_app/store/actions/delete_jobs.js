/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  deleteJobs as sendDeleteJobsRequest,
  createNoticeableDelay,
  showApiError,
} from '../../services';
import { getDetailPanelJob } from '../selectors';

import { UPDATE_JOB_START, UPDATE_JOB_SUCCESS, UPDATE_JOB_FAILURE } from '../action_types';

import { refreshJobs } from './refresh_jobs';
import { closeDetailPanel } from './detail_panel';

import { getNotifications } from '../../../kibana_services';

export const deleteJobs = (jobIds) => async (dispatch, getState) => {
  dispatch({
    type: UPDATE_JOB_START,
  });

  try {
    await createNoticeableDelay(sendDeleteJobsRequest(jobIds));
  } catch (error) {
    dispatch({
      type: UPDATE_JOB_FAILURE,
    });

    return showApiError(
      error,
      i18n.translate('xpack.rollupJobs.deleteAction.errorTitle', {
        defaultMessage: 'Error deleting rollup jobs',
      })
    );
  }

  if (jobIds.length === 1) {
    getNotifications().toasts.addSuccess(
      i18n.translate('xpack.rollupJobs.deleteAction.successSingleNotificationTitle', {
        defaultMessage: `Rollup job '{jobId}' was deleted`,
        values: { jobId: jobIds[0] },
      })
    );
  } else {
    getNotifications().toasts.addSuccess(
      i18n.translate('xpack.rollupJobs.deleteAction.successMultipleNotificationTitle', {
        defaultMessage: '{count} rollup jobs were deleted',
        values: { count: jobIds.length },
      })
    );
  }

  // If we've just deleted a job we were looking at, we need to close the panel.
  const detailPanelJob = getDetailPanelJob(getState());
  if (detailPanelJob && jobIds.includes(detailPanelJob.id)) {
    dispatch(closeDetailPanel());
  }

  dispatch({
    type: UPDATE_JOB_SUCCESS,
  });

  dispatch(refreshJobs());
};
