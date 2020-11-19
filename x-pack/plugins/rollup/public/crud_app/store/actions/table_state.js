/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FILTER_CHANGED, PAGE_CHANGED, PAGE_SIZE_CHANGED, SORT_CHANGED } from '../action_types';

export const filterChanged = ({ filter }) => (dispatch) => {
  dispatch({
    type: FILTER_CHANGED,
    payload: { filter },
  });
};

export const pageChanged = ({ pageNumber }) => (dispatch) => {
  dispatch({
    type: PAGE_CHANGED,
    payload: { pageNumber },
  });
};

export const pageSizeChanged = ({ pageSize }) => (dispatch) => {
  dispatch({
    type: PAGE_SIZE_CHANGED,
    payload: { pageSize },
  });
};

export const sortChanged = ({ sortField, isSortAscending }) => (dispatch) => {
  dispatch({
    type: SORT_CHANGED,
    payload: { sortField, isSortAscending },
  });
};
