/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export interface SelectedFilters {
  locations: string[];
  ports: number[];
  schemes: string[];
  tags: string[];
}

export type SelectedFiltersPayload = SelectedFilters;

export const getSelectedFilters = createAction<void>('GET SELECTED FILTERS');
export const setSelectedFilters = createAction<SelectedFiltersPayload | null>(
  'SET_SELECTED_FILTERS'
);
