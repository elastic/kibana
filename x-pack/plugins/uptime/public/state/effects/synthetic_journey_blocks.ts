/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import { call, fork, put, select, takeEvery, throttle } from 'redux-saga/effects';
import { ScreenshotBlockDoc } from '../../../common/runtime_types/ping/synthetics';
import { fetchScreenshotBlockSet } from '../api/journey';
import {
  fetchBlocksAction,
  setBlockLoadingAction,
  isPendingBlock,
  pruneCacheAction,
  putBlocksAction,
  putCacheSize,
  ScreenshotBlockCache,
  updateHitCountsAction,
} from '../reducers/synthetics';
import { syntheticsSelector } from '../selectors';

function* fetchBlocks(hashes: string[]) {
  yield put(setBlockLoadingAction(hashes));
  const blocks: ScreenshotBlockDoc[] = yield call(fetchScreenshotBlockSet, hashes);
  yield put(putBlocksAction({ blocks }));
}

export function* fetchScreenshotBlocks() {
  /**
   * We maintain a list of each hash and how many times it is requested so we can avoid
   * subsequent re-requests if the block is dropped due to cache pruning.
   */
  yield takeEvery(String(fetchBlocksAction), function* (action: Action<string[]>) {
    if (action.payload.length > 0) {
      yield put(updateHitCountsAction(action.payload));
    }
  });

  /**
   * We do a short delay to allow multiple item renders to queue up before dispatching
   * a fetch to the backend.
   */
  yield throttle(20, String(fetchBlocksAction), function* () {
    const { blocks }: { blocks: ScreenshotBlockCache } = yield select(syntheticsSelector);
    const toFetch = Object.keys(blocks).filter((hash) => {
      const block = blocks[hash];
      return isPendingBlock(block) && block.status !== 'loading';
    });

    if (toFetch.length > 0) {
      yield fork(fetchBlocks, toFetch);
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
    const { cacheSize }: { cacheSize: number } = yield select(syntheticsSelector);

    if (cacheSize > MAX_CACHE_SIZE) {
      yield put(pruneCacheAction(cacheSize - MAX_CACHE_SIZE));
    }
  });
}
