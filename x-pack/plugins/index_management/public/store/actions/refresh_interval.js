/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  REFRESH_RATE_INDEX_LIST
} from '../../constants';

import {
  getIndexNamesForCurrentPage
} from '../selectors';

import { reloadIndices } from '../actions';

const refreshList = (dispatch, getState) => () => {
  const indexNames = getIndexNamesForCurrentPage(getState());
  dispatch(reloadIndices(indexNames));
};

export const createRefreshInterval = (dispatch, getState) => {
  return setInterval(refreshList(dispatch, getState), REFRESH_RATE_INDEX_LIST);
};
