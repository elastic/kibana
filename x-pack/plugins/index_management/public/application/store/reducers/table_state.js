/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import {
  filterChanged,
  pageChanged,
  pageSizeChanged,
  sortChanged,
  toggleChanged,
} from '../actions';

export const defaultTableState = {
  filter: '',
  pageSize: 10,
  currentPage: 0,
  sortField: 'index.name',
  isSortAscending: true,
};

export const tableState = handleActions(
  {
    [filterChanged](state, action) {
      const { filter } = action.payload;
      return {
        ...state,
        filter,
        currentPage: 0,
      };
    },
    [toggleChanged](state, action) {
      const { toggleName, toggleValue } = action.payload;
      const toggleNameToVisibleMap = { ...state.toggleNameToVisibleMap };
      toggleNameToVisibleMap[toggleName] = toggleValue;
      return {
        ...state,
        toggleNameToVisibleMap,
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
        pageSize,
      };
    },
  },
  defaultTableState
);
