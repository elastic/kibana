/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { updateLimitOfPagination } from './actions';
import { HostsModel } from './model';

export type HostsState = HostsModel;

export const initialHostsState: HostsState = { limit: 2 };

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(updateLimitOfPagination, (state, { limit }) => ({
    ...state,
    limit,
  }))
  .build();
