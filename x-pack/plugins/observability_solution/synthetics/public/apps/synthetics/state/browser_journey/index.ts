/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';

import { isScreenshotBlockDoc } from '../../../../../common/runtime_types';

import type { BrowserJourneyState } from './models';
import {
  fetchJourneyAction,
  pruneCacheAction,
  putBlocksAction,
  putCacheSize,
  updateHitCountsAction,
  fetchBlocksAction,
  setBlockLoadingAction,
} from './actions';

const initialState: BrowserJourneyState = {
  blocks: {},
  cacheSize: 0,
  hitCount: [],
  journeys: {},
  journeysLoading: {},
};

export const browserJourneyReducer = createReducer(initialState, (builder) => {
  builder
    /**
     * When removing blocks from the cache, we receive an action with a number.
     * The number equates to the desired ceiling size of the cache. We then discard
     * blocks, ordered by the least-requested. We continue dropping blocks until
     * the newly-pruned size will be less than the ceiling supplied by the action.
     */
    .addCase(pruneCacheAction, (state, action) => {
      handlePruneAction(state, action.payload);
    })

    /**
     * Keep track of the least- and most-requested blocks, so when it is time to
     * prune we keep the most commonly-used ones.
     */
    .addCase(updateHitCountsAction, (state, action) => {
      handleUpdateHitCountsAction(state, action.payload);
    })

    .addCase(putCacheSize, (state, action) => {
      state.cacheSize = state.cacheSize + action.payload;
    })

    .addCase(fetchBlocksAction, (state, action) => {
      state.blocks = {
        ...state.blocks,
        ...action.payload
          // there's no need to overwrite existing blocks because the key
          // is either storing a pending req or a cached result
          .filter((b) => !state.blocks[b])
          // convert the list of new hashes in the payload to an object that
          // will combine with with the existing blocks cache
          .reduce(
            (acc, cur) => ({
              ...acc,
              [cur]: { status: 'pending' },
            }),
            {}
          ),
      };
    })

    .addCase(setBlockLoadingAction, (state, action) => {
      state.blocks = {
        ...state.blocks,
        ...action.payload.reduce(
          (acc, cur) => ({
            ...acc,
            [cur]: { status: 'loading' },
          }),
          {}
        ),
      };
    })

    .addCase(putBlocksAction, (state, action) => {
      state.blocks = {
        ...state.blocks,
        ...action.payload.blocks.reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
      };
    })
    .addCase(fetchJourneyAction.get, (state, action) => {
      state.journeysLoading[action.payload.checkGroup] = true;
    })
    .addCase(fetchJourneyAction.success, (state, action) => {
      state.journeysLoading[action.payload.checkGroup] = false;
      state.journeys[action.payload.checkGroup] = action.payload;
    })
    .addCase(fetchJourneyAction.fail, (state, action) => {
      if (action.payload.getPayload) {
        state.journeysLoading[action.payload.getPayload.checkGroup] = false;
      }
    });
});

function handlePruneAction(state: BrowserJourneyState, pruneSize: number) {
  const { blocks, hitCount } = state;
  const hashesToPrune: string[] = [];
  let sizeToRemove = 0;
  let removeIndex = hitCount.length - 1;
  while (sizeToRemove < pruneSize && removeIndex >= 0) {
    const { hash } = hitCount[removeIndex];
    removeIndex--;
    if (!blocks[hash]) continue;
    const block = blocks[hash];
    if (isScreenshotBlockDoc(block)) {
      sizeToRemove += block.synthetics.blob.length;
      hashesToPrune.push(hash);
    }
  }
  for (const hash of hashesToPrune) {
    delete blocks[hash];
  }

  state.cacheSize = state.cacheSize - sizeToRemove;
  state.hitCount = hitCount.slice(0, removeIndex + 1);
}

function handleUpdateHitCountsAction(state: BrowserJourneyState, hashes: string[]) {
  const newHitCount = [...state.hitCount];
  const hitTime = Date.now();
  hashes.forEach((hash) => {
    const countItem = newHitCount.find((item) => item.hash === hash);
    if (!countItem) {
      newHitCount.push({ hash, hitTime });
    } else {
      countItem.hitTime = hitTime;
    }
  });
  // sorts in descending order
  newHitCount.sort((a, b) => b.hitTime - a.hitTime);

  state.hitCount = newHitCount;
}

export * from './api';
export * from './models';
export * from './actions';
export * from './effects';
export * from './selectors';
