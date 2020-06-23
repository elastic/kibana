/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  FETCH_OVERVIEW_FILTERS,
  fetchOverviewFiltersFail,
  fetchOverviewFiltersSuccess,
} from '../actions';
import { fetchOverviewFilters } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchOverviewFiltersEffect() {
  yield takeLatest(
    FETCH_OVERVIEW_FILTERS,
    fetchEffectFactory(fetchOverviewFilters, fetchOverviewFiltersSuccess, fetchOverviewFiltersFail)
  );
}
