/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const applyFilters = createAction('APPLY_FILTERS');
export const filtersApplied = createAction('FILTERS_APPLIED');

export const filterChanged =
  createAction('FILTER_CHANGED');

export const pageChanged =
  createAction('PAGE_CHANGED');

export const pageSizeChanged =
  createAction('PAGE_SIZE_CHANGED');

export const sortChanged =
  createAction('SORT_CHANGED');
