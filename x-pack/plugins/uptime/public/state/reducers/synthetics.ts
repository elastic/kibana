/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction, handleActions, Action } from 'redux-actions';
import { ScreenshotBlockBlob } from '../../../common/runtime_types';

export interface PendingBlock {
  isPending: true;
}
export function isPendingBlock(data: unknown): data is PendingBlock {
  return (data as PendingBlock)?.isPending === true;
}
export type StoreScreenshotBlock = ScreenshotBlockBlob | PendingBlock;
export interface ScreenshotBlockCache {
  [hash: string]: StoreScreenshotBlock;
}

export interface SyntheticsReducerState {
  blocks: ScreenshotBlockCache;
}

export interface PutBlocksPayload {
  blocks: ScreenshotBlockBlob[];
}

export const fetchBlocksAction = createAction<string[]>('FETCH_BLOCKS');
export const putBlocksAction = createAction<PutBlocksPayload>('PUT_SCREENSHOT_BLOCKS');

type Payload = PutBlocksPayload & string[] & string;

const initialState: SyntheticsReducerState = {
  blocks: {},
};

export const syntheticsReducer = handleActions<SyntheticsReducerState, Payload>(
  {
    [String(fetchBlocksAction)]: (state, action: Action<string[]>) => {
      return {
        blocks: {
          ...state.blocks,
          ...action.payload
            // there's no need to overwrite existing blocks because the key
            // is either storing a pending req or a cached result
            .filter((b) => !state.blocks[b])
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
        blocks: {
          ...state.blocks,
          ...action.payload.blocks.reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {}),
        },
      };
    },
  },
  initialState
);
