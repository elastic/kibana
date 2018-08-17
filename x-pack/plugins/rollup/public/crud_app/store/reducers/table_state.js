/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  filterChanged,
  pageChanged,
  pageSizeChanged,
  sortChanged,
} from '../actions';

const defaultState = {
  filter: '',
  pageSize: 10,
  currentPage: 0,
  sortField: 'job.id',
  isSortAscending: true,
};

export const tableState = handleActions({
  [filterChanged](state, action) {
    const { filter } = action.payload;
    return {
      ...state,
      filter,
      currentPage: 0
    };
  },
  [sortChanged](state, action) {
    const { sortField, isSortAscending } = action.payload;

    return {
      ...state,
      sortField,
      isSortAscending,
    };
  },
  [pageChanged](state, action) {
    const { pageNumber } = action.payload;
    return {
      ...state,
      currentPage: pageNumber,
    };
  },
  [pageSizeChanged](state, action) {
    const { pageSize } = action.payload;
    return {
      ...state,
      pageSize
    };
  }
}, defaultState);
