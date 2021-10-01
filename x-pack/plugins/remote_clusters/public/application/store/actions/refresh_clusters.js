/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { loadClusters as sendLoadClustersRequest, showApiWarning } from '../../services';

import { REFRESH_CLUSTERS_SUCCESS } from '../action_types';

export const refreshClusters = () => async (dispatch) => {
  let clusters;
  try {
    clusters = await sendLoadClustersRequest({ asSystemRequest: true });
  } catch (error) {
    return showApiWarning(
      error,
      i18n.translate('xpack.remoteClusters.refreshAction.errorTitle', {
        defaultMessage: 'Error refreshing remote clusters',
      })
    );
  }

  dispatch({
    type: REFRESH_CLUSTERS_SUCCESS,
    payload: { clusters },
  });
};
