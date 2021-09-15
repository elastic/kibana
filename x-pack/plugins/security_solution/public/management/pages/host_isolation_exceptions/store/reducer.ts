/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableReducer } from '../../../../common/store';
import { AppAction } from '../../../../common/store/actions';
import { HostIsolationExceptionsPageState } from '../types';
import { initialHostIsolationExceptionsPageState } from './builders';

type StateReducer = ImmutableReducer<HostIsolationExceptionsPageState, AppAction>;

export const hostIsolationExceptionsPageReducer: StateReducer = (
  state = initialHostIsolationExceptionsPageState(),
  action
) => {
  // switch (action.type) {
  // }
  return state;
};
