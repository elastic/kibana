/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction, handleActions, Action } from 'redux-actions';
import {
  isScreenshotBlockDoc,
  ScreenshotBlockDoc,
} from '../../../common/runtime_types/ping/synthetics';

export interface PendingBlock {
  status: 'pending' | 'loading';
}

export function isPendingBlock(data: unknown): data is PendingBlock {
  return ['pending', 'loading'].some((s) => s === (data as PendingBlock)?.status);
}
export type StoreScreenshotBlock = ScreenshotBlockDoc | PendingBlock;
export interface ScreenshotBlockCache {
  [hash: string]: StoreScreenshotBlock;
}

export interface CacheHitCount {
  hash: string;
  hitTime: number;
}

export interface SyntheticsReducerState {
  blocks: ScreenshotBlockCache;
  cacheSize: number;
  hitCount: CacheHitCount[];
}

export interface PutBlocksPayload {
  blocks: ScreenshotBlockDoc[];
}

// this action denotes a set of blocks is required
export const fetchBlocksAction = createAction<string[]>('FETCH_BLOCKS');
// this action denotes a request for a set of blocks is in flight
export const setBlockLoadingAction = createAction<string[]>('IN_FLIGHT_BLOCKS_ACTION');
// block data has been received, and should be added to the store
export const putBlocksAction = createAction<PutBlocksPayload>('PUT_SCREENSHOT_BLOCKS');
// updates the total size of the image blob data cached in the store
export const putCacheSize = createAction<number>('PUT_CACHE_SIZE');
// keeps track of the most-requested blocks
export const updateHitCountsAction = createAction<string[]>('UPDATE_HIT_COUNTS');
// reduce the cache size to the value in the action payload
export const pruneCacheAction = createAction<number>('PRUNE_SCREENSHOT_BLOCK_CACHE');

const initialState: SyntheticsReducerState = {
  blocks: {},
  cacheSize: 0,
  hitCount: [],
};

// using `any` here because `handleActions` is not set up well to handle the multi-type
// nature of all the actions it supports. redux-actions is looking for new maintainers https://github.com/redux-utilities/redux-actions#looking-for-maintainers
// and seems that we should move to something else like Redux Toolkit.
export const syntheticsReducer = handleActions<
  SyntheticsReducerState,
  string[] & PutBlocksPayload & number
>(
  {
    /**
     * When removing blocks from the cache, we receive an action with a number.
     * The number equates to the desired ceiling size of the cache. We then discard
     * blocks, ordered by the least-requested. We continue dropping blocks until
     * the newly-pruned size will be less than the ceiling supplied by the action.
     */
    [String(pruneCacheAction)]: (state, action: Action<number>) => handlePruneAction(state, action),

    /**
     * Keep track of the least- and most-requested blocks, so when it is time to
     * prune we keep the most commonly-used ones.
     */
    [String(updateHitCountsAction)]: (state, action: Action<string[]>) =>
      handleUpdateHitCountsAction(state, action),

    [String(putCacheSize)]: (state, action: Action<number>) => ({
      ...state,
      cacheSize: state.cacheSize + action.payload,
    }),

    [String(fetchBlocksAction)]: (state, action: Action<string[]>) => ({
      // increment hit counts
      ...state,
      blocks: {
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
      },
    }),

    /**
     * All hashes contained in the action payload have been requested, so we can
     * indicate that they're loading. Subsequent requests will skip them.
     */
    [String(setBlockLoadingAction)]: (state, action: Action<string[]>) => ({
      ...state,
      blocks: {
        ...state.blocks,
        ...action.payload.reduce(
          (acc, cur) => ({
            ...acc,
            [cur]: { status: 'loading' },
          }),
          {}
        ),
      },
    }),

    [String(putBlocksAction)]: (state, action: Action<PutBlocksPayload>) => ({
      ...state,
      blocks: {
        ...state.blocks,
        ...action.payload.blocks.reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
      },
    }),
  },
  initialState
);

function handlePruneAction(state: SyntheticsReducerState, action: Action<number>) {
  const { blocks, hitCount } = state;
  const hashesToPrune: string[] = [];
  let sizeToRemove = 0;
  let removeIndex = hitCount.length - 1;
  while (sizeToRemove < action.payload && removeIndex >= 0) {
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
  return {
    cacheSize: state.cacheSize - sizeToRemove,
    blocks: { ...blocks },
    hitCount: hitCount.slice(0, removeIndex + 1),
  };
}

function handleUpdateHitCountsAction(state: SyntheticsReducerState, action: Action<string[]>) {
  const newHitCount = [...state.hitCount];
  const hitTime = Date.now();
  action.payload.forEach((hash) => {
    const countItem = newHitCount.find((item) => item.hash === hash);
    if (!countItem) {
      newHitCount.push({ hash, hitTime });
    } else {
      countItem.hitTime = hitTime;
    }
  });
  // sorts in descending order
  newHitCount.sort((a, b) => b.hitTime - a.hitTime);
  return {
    ...state,
    hitCount: newHitCount,
  };
}
