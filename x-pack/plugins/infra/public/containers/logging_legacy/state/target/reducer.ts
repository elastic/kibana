/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { LogEntryTime } from '../../../../../common/log_entry';
import { jumpToTarget } from './actions';

export type TargetState = LogEntryTime;

export const initialTargetState: TargetState = {
  tiebreaker: 0,
  time: 0,
};

export const targetReducer = reducerWithInitialState(initialTargetState).case(
  jumpToTarget,
  (state, target) => target
);
