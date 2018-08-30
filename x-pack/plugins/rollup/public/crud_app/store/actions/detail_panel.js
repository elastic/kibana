/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractQueryParams, getRouter } from '../../services';

export const closeDetailPanel = () => async (dispatch) => {
  dispatch({
    type: 'INDEX_ROLLUP_JOB_CLOSE_DETAIL_PANEL',
  });
};

export const openDetailPanel = ({ panelType, jobId }) => async (dispatch) => {
  const { history } = getRouter();
  const search = history.location.search;
  const { job: deepLinkedJobId } = extractQueryParams(search);

  if (deepLinkedJobId !== jobId) {
    // Allow the user to share a deep link to this job.
    history.replace({
      search: `?job=${jobId}`,
    });
  }

  dispatch({
    type: 'INDEX_ROLLUP_JOB_OPEN_DETAIL_PANEL',
    payload: { panelType, jobId },
  });
};

