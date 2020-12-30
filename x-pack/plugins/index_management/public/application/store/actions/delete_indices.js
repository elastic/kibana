/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { deleteIndices as request } from '../../services';
import { notificationService } from '../../services/notification';
import { clearRowStatus } from '../actions';

export const deleteIndicesSuccess = createAction('INDEX_MANAGEMENT_DELETE_INDICES_SUCCESS');
export const deleteIndices = ({ indexNames }) => async (dispatch) => {
  try {
    await request(indexNames);
  } catch (error) {
    notificationService.showDangerToast(error.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  notificationService.showSuccessToast(
    i18n.translate('xpack.idxMgmt.deleteIndicesAction.successfullyDeletedIndicesMessage', {
      defaultMessage: 'Successfully deleted: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') },
    })
  );
  dispatch(deleteIndicesSuccess({ indexNames }));
};
