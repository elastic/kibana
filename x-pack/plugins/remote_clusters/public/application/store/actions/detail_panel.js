/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractQueryParams } from '../../../shared_imports';
import { getRouter } from '../../services';
import { OPEN_DETAIL_PANEL, CLOSE_DETAIL_PANEL } from '../action_types';

export const openDetailPanel = ({ name }) => (dispatch) => {
  const { history } = getRouter();
  const search = history.location.search;
  const { cluster: clusterName } = extractQueryParams(search);

  if (clusterName !== name) {
    // Allow the user to share a deep link to this job.
    history.replace({
      search: `?cluster=${name}`,
    });
  }

  dispatch({
    type: OPEN_DETAIL_PANEL,
    payload: { clusterName: name },
  });
};

export const closeDetailPanel = () => (dispatch) => {
  dispatch({
    type: CLOSE_DETAIL_PANEL,
  });
};
