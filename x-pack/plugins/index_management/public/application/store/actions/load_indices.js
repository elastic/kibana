/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { loadIndices as request } from '../../services';

export const loadIndicesStart = createAction('INDEX_MANAGEMENT_LOAD_INDICES_START');
export const loadIndicesSuccess = createAction('INDEX_MANAGEMENT_LOAD_INDICES_SUCCESS');
export const loadIndicesError = createAction('INDEX_MANAGEMENT_LOAD_INDICES_ERROR');

export const loadIndices = () => async dispatch => {
  dispatch(loadIndicesStart());
  let indices;
  try {
    indices = await request();
  } catch (error) {
    return dispatch(loadIndicesError(error));
  }
  dispatch(loadIndicesSuccess({ indices }));
};
