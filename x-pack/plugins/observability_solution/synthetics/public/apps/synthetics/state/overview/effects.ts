/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce, call, takeLeading, takeEvery, put, select } from 'redux-saga/effects';
import { selectOverviewTrends, selectTrendState } from './selectors';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  fetchMonitorOverviewAction,
  quietFetchOverviewAction,
  refreshOverviewTrends,
  stackTrendStats,
  trendStatsBatch,
  trendStatsInFlight,
} from './actions';
import { fetchMonitorOverview, fetchOverviewTrendStats as trendsApi } from './api';
import type { TrendTable } from './models';

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

const CHUNK_SIZE = 40;
export function* fetchOverviewTrendStats() {
  yield takeEvery(
    trendStatsBatch.get,
    function* (
      action: ReturnType<typeof trendStatsBatch.get>
    ): Generator<unknown, void, TrendTable> {
      try {
        // track the loading state in the reducer
        // if in flight, push this to a FILO queue which we update on success/fail of the fetch effect here. This will need a new action. Then, grab the newest chunk from the queue and fetch it.
        const { trendsLoading } = yield select(selectTrendState);
        console.log('trends loading value', trendsLoading);
        for (let i = action.payload.length; i > 0; i -= CHUNK_SIZE) {
          const chunk = action.payload.slice(Math.max(i - CHUNK_SIZE, 0), i);
          if (!trendsLoading && chunk.length > 0) {
            yield put(trendStatsInFlight(true));
            const trendStats = yield call(trendsApi, chunk);
            yield put(trendStatsBatch.success(trendStats));
          } else if (chunk.length > 0) {
            console.log('data loading, pushing to stack');
            // push to queue
            yield put(stackTrendStats(chunk));
          }
        }
      } catch (e: any) {
        yield put(trendStatsBatch.fail(e));
      }
    }
  );
}

export function* popPendingTrendRequests() {
  yield takeEvery([trendStatsBatch.success, trendStatsBatch.fail, stackTrendStats], function* () {
    const { trendsPendingStack } = yield select(selectTrendState);
    if (trendsPendingStack.length) {
      console.log('trends stack', trendsPendingStack);

      // using splice in this way removes the last CHUNK_SIZE elements from the array
      const batch = trendsPendingStack.splice(-CHUNK_SIZE, CHUNK_SIZE);

      console.log('trends pending stack', trendsPendingStack);
      console.log('batch', batch);

      yield put(stackTrendStats(trendsPendingStack));
      yield put(trendStatsBatch.get(batch));
    }
  });
}

export function* refreshOverviewTrendStats() {
  yield takeLeading(refreshOverviewTrends.get, function* (): Generator<unknown, void, TrendTable> {
    const existingTrends: TrendTable = yield select(selectOverviewTrends);
    let acc = {};
    const keys = Object.keys(existingTrends);
    do {
      console.log('doing a refresh', new Date());
      const res = yield call(
        trendsApi,
        keys
          .splice(0, keys.length < 10 ? keys.length : 10)
          .filter((key: string) => existingTrends[key] !== null)
          .map((key: string) => ({
            configId: existingTrends[key]!.configId,
            locationId: existingTrends[key]!.locationId,
          }))
      );
      console.log('received data', new Date());
      acc = { ...acc, ...res };
    } while (keys.length);
    if (Object.keys(acc).length) {
      yield put(trendStatsBatch.success(acc));
    }
  });
}
