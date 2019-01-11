/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  updateAuthorizationsLimit,
  updateEventsLimit,
  updateHostsLimit,
  updateUncommonProcessesLimit,
  updateUncommonProcessesUpperLimit,
} from './actions';
import { HostsModel } from './model';

export type HostsState = HostsModel;

export const initialHostsState: HostsState = {
  query: {
    authorizations: {
      limit: 10,
    },
    hosts: {
      limit: 1,
    },
    events: {
      limit: 10,
    },
    uncommonProcesses: {
      limit: 10,
      upperLimit: 100,
    },
  },
};

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(updateAuthorizationsLimit, (state, { limit }) => ({
    ...state,
    query: {
      ...state.query,
      authorizations: {
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
