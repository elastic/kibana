/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  updateHostsLimit,
  updateUncommonProcessesLimit,
  updateUncommonProcessesUpperLimit,
} from './actions';
import { HostsModel } from './model';

export type HostsState = HostsModel;

export const initialHostsState: HostsState = {
  query: {
    hosts: {
      limit: 2,
    },
    uncommonProcesses: {
      limit: 10,
      upperLimit: 100,
    },
  },
};

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(updateHostsLimit, (state, { limit }) => ({
    ...state,
    query: {
      ...state.query,
      hosts: {
        limit,
      },
    },
  }))
  .case(updateUncommonProcessesLimit, (state, { limit }) => ({
    ...state,
    query: {
      ...state.query,
      uncommonProcesses: {
        ...state.query.uncommonProcesses,
        limit,
      },
    },
  }))
  .case(updateUncommonProcessesUpperLimit, (state, { upperLimit }) => ({
    ...state,
    query: {
      ...state.query,
      uncommonProcesses: {
        ...state.query.uncommonProcesses,
        upperLimit,
      },
    },
  }))
  .build();
