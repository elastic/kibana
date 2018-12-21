/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { setMinimapIntervalSize } from './actions';

export interface LogMinimapState {
  intervalSize: number;
}

export const initialLogMinimapState: LogMinimapState = {
  intervalSize: 1000 * 60 * 60 * 24,
};

export const logMinimapReducer = reducerWithInitialState(initialLogMinimapState)
  .case(setMinimapIntervalSize, (state, intervalSize) => ({
    intervalSize,
  }))
  .build();
