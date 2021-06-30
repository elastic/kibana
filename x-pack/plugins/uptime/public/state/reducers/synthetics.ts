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
  isPending: true;
}
export function isPendingBlock(data: unknown): data is PendingBlock {
  return (data as PendingBlock)?.isPending === true;
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

export const fetchBlocksAction = createAction<string[]>('FETCH_BLOCKS');
export const putBlocksAction = createAction<PutBlocksPayload>('PUT_SCREENSHOT_BLOCKS');
export const putCacheSize = createAction<number>('PUT_CACHE_SIZE');
export const updateHitCountsAction = createAction<string[]>('UPDATE_HIT_COUNTS');
export const pruneCacheAction = createAction<number>('PRUNE_SCREENSHOT_BLOCK_CACHE');

type Payload = PutBlocksPayload & string[] & string & number;

const initialState: SyntheticsReducerState = {
  blocks: {},
  cacheSize: 0,
  hitCount: [],
};

export const syntheticsReducer = handleActions<SyntheticsReducerState, Payload>(
  {
    [String(pruneCacheAction)]: (state, action: Action<number>) => {
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
          sizeToRemove += block.synthetics.blob.length ?? 0;
          hashesToPrune.push(hash);
        }
      }
      for (const hash of hashesToPrune) {
        delete blocks[hash];
      }
      return {
        cacheSize: state.cacheSize - sizeToRemove,
        blocks: Object.assign({}, blocks),
        hitCount: hitCount.slice(0, removeIndex + 1),
      };
    },
    [String(updateHitCountsAction)]: (state, action: Action<string[]>) => {
      const newHitCount = [...state.hitCount];
      const hitTime = Date.now();
      action.payload.forEach((hash) => {
        const countItem = newHitCount.find((item) => item.hash === hash);
        if (!countItem) {
          // console.log('made it in here');
          newHitCount.push({ hash, hitTime });
        } else {
          countItem.hitTime = hitTime;
        }
      });
      // sorts in descending order
      newHitCount.sort((a, b) => b.hitTime - a.hitTime);
      // console.log('new hit count', newHitCount);
      return {
        ...state,
        hitCount: newHitCount,
      };
    },
    [String(putCacheSize)]: (state, action: Action<number>) => {
      // console.log('new cache size', state.cacheSize + action.payload);
      return {
        ...state,
        cacheSize: state.cacheSize + action.payload,
      };
    },
    [String(fetchBlocksAction)]: (state, action: Action<string[]>) => {
      // increment hit counts
      return {
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
                [cur]: { isPending: true },
              }),
              {}
            ),
        },
      };
    },
    [String(putBlocksAction)]: (state, action: Action<PutBlocksPayload>) => {
      return {
        ...state,
        blocks: {
          ...state.blocks,
          ...action.payload.blocks.reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
        },
      };
    },
  },
  initialState
);
