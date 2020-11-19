/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { forcemergeIndices as request } from '../../services';
import { clearRowStatus, reloadIndices } from '../actions';
import { notificationService } from '../../services/notification';

export const forcemergeIndicesStart = createAction('INDEX_MANAGEMENT_FORCEMERGE_INDICES_START');

export const forcemergeIndices = ({ indexNames, maxNumSegments }) => async (dispatch) => {
  dispatch(forcemergeIndicesStart({ indexNames }));
  try {
    await request(indexNames, maxNumSegments);
  } catch (error) {
    notificationService.showDangerToast(error.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  dispatch(reloadIndices(indexNames));
  notificationService.showSuccessToast(
    i18n.translate('xpack.idxMgmt.forceMergeIndicesAction.successfullyForceMergedIndicesMessage', {
      defaultMessage: 'Successfully force merged: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') },
    })
  );
};
