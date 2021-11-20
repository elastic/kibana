/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { loadJobs as sendLoadJobsRequest, deserializeJobs, showApiWarning } from '../../services';
import { REFRESH_JOBS_SUCCESS } from '../action_types';

export const refreshJobs = (options) => async (dispatch) => {
  let jobs;
  try {
    jobs = await sendLoadJobsRequest(options);
  } catch (error) {
    return showApiWarning(
      error,
      i18n.translate('xpack.rollupJobs.refreshAction.errorTitle', {
        defaultMessage: 'Error refreshing rollup jobs',
      })
    );
  }

  dispatch({
    type: REFRESH_JOBS_SUCCESS,
    payload: { jobs: deserializeJobs(jobs) },
  });
};
