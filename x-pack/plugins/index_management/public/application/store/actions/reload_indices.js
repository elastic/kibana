/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { reloadIndices as request } from '../../services';
import { loadIndices } from './load_indices';
import { notificationService } from '../../services/notification';

export const reloadIndicesSuccess = createAction('INDEX_MANAGEMENT_RELOAD_INDICES_SUCCESS');
export const reloadIndices = (indexNames, options) => async (dispatch) => {
  let indices;
  try {
    indices = await request(indexNames, options);
  } catch (error) {
    // an index has been deleted
    // or the user does not have privileges for one of the indices on the current page,
    // reload the full list
    if (error.status === 404 || error.status === 403) {
      return dispatch(loadIndices());
    }
    return notificationService.showDangerToast(error.body.message);
  }
  if (indices && indices.length > 0) {
    return dispatch(reloadIndicesSuccess({ indices }));
  } else {
    return notificationService.showWarningToast(
      i18n.translate('xpack.idxMgmt.reloadIndicesAction.indicesPageRefreshFailureMessage', {
        defaultMessage: 'Failed to refresh current page of indices.',
      })
    );
  }
};
