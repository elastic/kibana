/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import { call, fork, put, select, takeEvery } from 'redux-saga/effects';
import { ScreenshotBlockDoc } from '../../../common/runtime_types/ping/synthetics';
import { fetchScreenshotBlockSet } from '../api/journey';
import {
  fetchBlocksAction,
  isPendingBlock,
  pruneCacheAction,
  putBlocksAction,
  putCacheSize,
  ScreenshotBlockCache,
  updateHitCountsAction,
} from '../reducers/synthetics';
import { journeyScreenshotBlockSelector, syntheticsImageCacheSizeSelector } from '../selectors';

function* fetchBlock(hashes: string[]) {
  const blocks: ScreenshotBlockDoc[] = yield call(fetchScreenshotBlockSet, hashes);
  yield put(putBlocksAction({ blocks }));
}

export function* fetchScreenshotBlocks() {
  yield takeEvery(String(fetchBlocksAction), function* (action: Action<string[]>) {
    const blocks: ScreenshotBlockCache = yield select(journeyScreenshotBlockSelector);
    const toFetch = action.payload.filter(
      (hash) => !blocks.hasOwnProperty(hash) || isPendingBlock(blocks[hash])
    );

    if (toFetch.length > 0) {
      yield fork(fetchBlock, toFetch);
    }

    if (action.payload.length > 0) {
      yield put(updateHitCountsAction(action.payload));
    }
  });
}

export function* generateBlockStatsOnPut() {
  yield takeEvery(
    String(putBlocksAction),
    function* (action: Action<{ blocks: ScreenshotBlockDoc[] }>) {
      const batchSize = action.payload.blocks.reduce((total, cur) => {
        return cur.synthetics.blob.length + total;
      }, 0);
      yield put(putCacheSize(batchSize));
    }
  );
}

// 4 MB cap for cache size
const MAX_CACHE_SIZE = 4000000;

export function* pruneBlockCache() {
  yield takeEvery(String(putCacheSize), function* (_action: Action<number>) {
    const cacheSize: number = yield select(syntheticsImageCacheSizeSelector);

    if (cacheSize > MAX_CACHE_SIZE) {
      // console.log(
      //   `prune block called because ${cacheSize} is greater than ${MAX_CACHE_SIZE}`,
      //   action
      // );
      yield put(pruneCacheAction(cacheSize - MAX_CACHE_SIZE));
    }
  });
}
