/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FILTER_CHANGED, PAGE_CHANGED, PAGE_SIZE_CHANGED, SORT_CHANGED } from '../action_types';

const initialState = {
  filter: '',
  pageSize: 20,
  currentPage: 0,
  sortField: 'job.id',
  isSortAscending: true,
};

export function tableState(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case FILTER_CHANGED:
      const { filter } = payload;
      return {
        ...state,
        filter,
        currentPage: 0,
      };

    case SORT_CHANGED:
      const { sortField, isSortAscending } = payload;
      return {
        ...state,
        sortField,
        isSortAscending,
      };

    case PAGE_CHANGED:
      const { pageNumber } = payload;
      return {
        ...state,
        currentPage: pageNumber,
      };

    case PAGE_SIZE_CHANGED:
      const { pageSize } = payload;
      return {
        ...state,
        pageSize,
      };

    default:
      return state;
  }
}
