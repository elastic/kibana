/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { loadIndices as request } from '../../services';
import { toastNotifications } from 'ui/notify';

export const loadIndicesSuccess = createAction('INDEX_MANAGEMENT_LOAD_INDICES_SUCCESS');
export const loadIndices = () => async (dispatch) => {
  let indices;
  try {
    indices = await request();
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
  dispatch(loadIndicesSuccess({ indices }));
};
