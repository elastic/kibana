/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const applyFilters = createAction('INDEX_MANAGEMENT_APPLY_FILTERS');
export const filtersApplied = createAction('INDEX_MANAGEMENT_FILTERS_APPLIED');

export const filterChanged =
  createAction('INDEX_MANAGEMENT_FILTER_CHANGED');

export const pageChanged =
  createAction('INDEX_MANAGEMENT_PAGE_CHANGED');

export const pageSizeChanged =
  createAction('INDEX_MANAGEMENT_PAGE_SIZE_CHANGED');

export const sortChanged =
  createAction('INDEX_MANAGEMENT_SORT_CHANGED');

export const showSystemIndicesChanged =
  createAction('INDEX_MANAGEMENT_SHOW_SYSTEM_INDICES_CHANGED');

export const toggleChanged =
  createAction('INDEX_MANAGEMENT_TOGGLE_CHANGED');