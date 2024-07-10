/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce, call, takeLeading, takeEvery, put, select } from 'redux-saga/effects';
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
  yield takeEvery(
    trendStatsBatch.get,
    function* (
      action: ReturnType<typeof trendStatsBatch.get>
    ): Generator<unknown, void, Record<string, any>> {
      try {
        const chunkSize = 40;
        for (let i = action.payload.length; i > 0; i -= chunkSize) {
          const chunk = action.payload.slice(Math.max(i - chunkSize, 0), i);
          if (chunk.length > 0) {
            const trendStats = yield call(trendsApi, chunk);
            yield put(trendStatsBatch.success(trendStats));
          }
        }
      } catch (e: any) {
        yield put(trendStatsBatch.fail(e));
      }
    }
  );
}

// writing refresh logic
export function* refreshOverviewTrendStats() {
  yield takeLeading(refreshOverviewTrends.get, function* (): Generator<
    unknown,
    void,
    Record<string, any>
  > {
    const existingTrends: Record<string, any> = yield select(selectOverviewTrends);
    let acc = {};
    const keys = Object.keys(existingTrends);
    do {
      const res = yield call(
        trendsApi,
        keys
          .splice(0, keys.length < 10 ? keys.length : 10)
          .filter((key: string) => existingTrends[key] !== null)
          .map((key: string) => ({
            configId: existingTrends[key].configId,
            locationId: existingTrends[key].locationId,
          }))
      );
      acc = { ...acc, ...res };
    } while (keys.length);
    if (Object.keys(acc).length) {
      yield put(trendStatsBatch.success(acc));
    }
  });
}
