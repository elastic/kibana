/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { TimeScale, TimeUnit } from '../../../../common/time';
import { setMinimapScale } from './actions';

export interface LogMinimapState {
  scale: TimeScale;
}

export const initialLogMinimapState: LogMinimapState = {
  scale: {
    unit: TimeUnit.Day,
    value: 1,
  },
};

export const logMinimapReducer = reducerWithInitialState(initialLogMinimapState)
  .case(setMinimapScale, (state, { scale }) => ({
    scale,
  }))
  .build();
