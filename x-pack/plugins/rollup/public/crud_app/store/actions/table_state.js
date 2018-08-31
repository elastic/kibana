/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  APPLY_FILTERS,
  FILTERS_APPLIED,
  FILTER_CHANGED,
  PAGE_CHANGED,
  PAGE_SIZE_CHANGED,
  SORT_CHANGED,
} from '../action_types';

export const applyFilters = () => (dispatch) => {
  dispatch({
    type: APPLY_FILTERS,
  });
};

export const filtersApplied = () => (dispatch) => {
  dispatch({
    type: FILTERS_APPLIED,
  });
};

export const filterChanged = () => (dispatch) => {
  dispatch({
    type: FILTER_CHANGED,
  });
};

export const pageChanged = () => (dispatch) => {
  dispatch({
    type: PAGE_CHANGED,
  });
};

export const pageSizeChanged = () => (dispatch) => {
  dispatch({
    type: PAGE_SIZE_CHANGED,
  });
};

export const sortChanged = () => (dispatch) => {
  dispatch({
    type: SORT_CHANGED,
  });
};
