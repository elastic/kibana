/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { FetchJourneyStepsParams } from '..';
import { SyntheticsJourneyApiResponse } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';
import { PutBlocksPayload } from './models';

// This action denotes a set of blocks is required
export const fetchBlocksAction = createAction<string[]>('[BROWSER JOURNEY] FETCH BLOCKS');

// This action denotes a request for a set of blocks is in flight
export const setBlockLoadingAction = createAction<string[]>(
  '[BROWSER JOURNEY] SET BLOCKS IN FLIGHT'
);

// Block data has been received, and should be added to the store
export const putBlocksAction = createAction<PutBlocksPayload>(
  '[BROWSER JOURNEY] PUT SCREENSHOT BLOCKS'
);

// Updates the total size of the image blob data cached in the store
export const putCacheSize = createAction<number>('[BROWSER JOURNEY] PUT CACHE SIZE');

// Keeps track of the most-requested blocks
export const updateHitCountsAction = createAction<string[]>('[BROWSER JOURNEY] UPDATE HIT COUNTS');

// Reduce the cache size to the value in the action payload
export const pruneCacheAction = createAction<number>(
  '[BROWSER JOURNEY] PRUNE SCREENSHOT BLOCK CACHE'
);

export const fetchJourneyAction = createAsyncAction<
  FetchJourneyStepsParams,
  SyntheticsJourneyApiResponse
>('fetchJourneyStepsAction');
