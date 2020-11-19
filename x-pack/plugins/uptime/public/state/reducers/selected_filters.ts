/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import {
  getSelectedFilters,
  setSelectedFilters,
  SelectedFilters,
} from '../actions/selected_filters';

const initialState: SelectedFilters | null = null;

export function selectedFiltersReducer(
  state = initialState,
  action: Action<any>
): SelectedFilters | null {
  switch (action.type) {
    case String(getSelectedFilters):
      return state;
    case String(setSelectedFilters):
      if (state === null) return { ...action.payload };
      return {
        ...(state || {}),
        ...action.payload,
      };
    default:
      return state;
  }
}
