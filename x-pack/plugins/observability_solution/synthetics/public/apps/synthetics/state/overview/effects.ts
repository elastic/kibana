/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce, call, takeLeading, put, select } from 'redux-saga/effects';
import { selectOverviewTrends } from './selectors';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  fetchMonitorOverviewAction,
  quietFetchOverviewAction,
  refreshOverviewTrends,
  trendStatsBatch,
} from './actions';
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
  yield takeLeading(
    trendStatsBatch.get,
    fetchEffectFactory(trendsApi, trendStatsBatch.success, trendStatsBatch.fail)
  );
}

// writing refresh logic
export function* refreshOverviewTrendStats() {
  yield takeLeading(refreshOverviewTrends.get, function* (): Generator<
    unknown,
    void,
    Record<string, any>
  > {
    const trends: Record<string, any> = yield select(selectOverviewTrends);
    let all = {};
    const keys = Object.keys(trends);
    do {
      const res = yield call(
        trendsApi,
        keys
          .splice(0, keys.length < 10 ? keys.length : 10)
          .filter((key: string) => trends[key] !== null)
          .map((key: string) => ({
            configId: trends[key].configId,
            locationId: trends[key].locationId,
          }))
      );
      all = { ...all, ...res };
    } while (keys.length);
    if (Object.keys(all).length) {
      yield put(trendStatsBatch.success(all));
    }
  });
}
