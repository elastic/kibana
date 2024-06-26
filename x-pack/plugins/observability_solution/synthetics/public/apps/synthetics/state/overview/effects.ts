/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce, takeEvery, takeLeading } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorOverviewAction, quietFetchOverviewAction, trendStatsBatch } from './actions';
import { fetchMonitorOverview, fetchOverviewTrendStats as trendsApi } from './api';

export function* fetchMonitorOverviewEffect() {
  yield debounce(
    200, // Only take the latest while ignoring any intermediate triggers
    [fetchMonitorOverviewAction.get, quietFetchOverviewAction.get],
    fetchEffectFactory(
      fetchMonitorOverview,
      fetchMonitorOverviewAction.success,
      fetchMonitorOverviewAction.fail
    )
  );
}

export function* fetchOverviewTrendStats() {
  console.log('in effect');
  yield takeLeading(
    trendStatsBatch.get,
    fetchEffectFactory(trendsApi, trendStatsBatch.success, trendStatsBatch.fail)
  );
}
