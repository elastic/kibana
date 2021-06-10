/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import { call, fork, put, select, takeEvery } from 'redux-saga/effects';
import { ScreenshotBlockBlob } from '../../../common/runtime_types';
import { fetchScreenshotBlockSet } from '../api/journey';
import {
  fetchBlocksAction,
  isPendingBlock,
  putBlocksAction,
  ScreenshotBlockCache,
} from '../reducers/synthetics';
import { journeyScreenshotBlockSelector } from '../selectors';

function* fetchBlock(hash: string[]) {
  const blocks: ScreenshotBlockBlob[] = yield call(fetchScreenshotBlockSet, hash);
  yield put(putBlocksAction({ blocks }));
}

export function* fetchScreenshotBlocks() {
  yield takeEvery(String(fetchBlocksAction), function* (action: Action<string[]>) {
    const blocks: ScreenshotBlockCache = yield select(journeyScreenshotBlockSelector);
    const toFetch = action.payload.filter(
      (h) => !blocks.hasOwnProperty(h) || isPendingBlock(blocks[h])
    );
    if (toFetch.length > 0) {
      console.log(`attempting to fetch ${toFetch.length} blocks at once`);
      yield fork(fetchBlock, toFetch);
    }

    // for (const hash of action.payload.filter(b =>)) {
    //   const blocks: ScreenshotBlockCache = yield select(journeyScreenshotBlockSelector);
    //   if (!blocks.hasOwnProperty(hash) || isPendingBlock(blocks[hash])) {
    //     yield fork(fetchBlock, hash);
    //   } else {
    //     console.log('skipped ok');
    //   }
    // }
    // call()
  });
}
