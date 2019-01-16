/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  updateAuthenticationsLimit,
  updateEventsLimit,
  updateHostsLimit,
  updateUncommonProcessesLimit,
  updateUncommonProcessesUpperLimit,
} from './actions';
import { HostsModel } from './model';

export type HostsState = HostsModel;

export const DEFAULT_LIMIT = 10;

export const initialHostsState: HostsState = {
  query: {
    authentications: {
      limit: DEFAULT_LIMIT,
    },
    hosts: {
      limit: DEFAULT_LIMIT,
    },
    events: {
      limit: DEFAULT_LIMIT,
    },
    uncommonProcesses: {
      limit: DEFAULT_LIMIT,
      upperLimit: 100,
    },
  },
};

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(updateAuthenticationsLimit, (state, { limit }) => ({
    ...state,
    query: {
      ...state.query,
      authentications: {
        limit,
      },
    },
  }))
  .case(updateHostsLimit, (state, { limit }) => ({
    ...state,
    query: {
      ...state.query,
      hosts: {
        limit,
      },
    },
  }))
  .case(updateEventsLimit, (state, { limit }) => ({
    ...state,
    query: {
      ...state.query,
      events: {
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
