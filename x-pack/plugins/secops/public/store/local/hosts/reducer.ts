/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { get } from 'lodash/fp';
import {
  applyHostsFilterQuery,
  setHostsFilterQueryDraft,
  updateAuthenticationsLimit,
  updateEventsLimit,
  updateHostsLimit,
  updateUncommonProcessesLimit,
} from './actions';
import { HostsModel } from './model';

export type HostsState = HostsModel;

export const DEFAULT_LIMIT = 10;

export const initialHostsState: HostsState = {
  page: {
    queries: {
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
      },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
  details: {
    queries: {
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
      },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
};

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(updateAuthenticationsLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      queries: {
        ...get(`${hostsType}.queries`, state),
        authentications: {
          limit,
        },
      },
    },
  }))
  .case(updateHostsLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...get(`${hostsType}`, state),
      queries: {
        ...get(`${hostsType}.queries`, state),
        hosts: {
          limit,
        },
      },
    },
  }))
  .case(updateEventsLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      queries: {
        ...get(`${hostsType}.queries`, state),
        events: {
          limit,
        },
      },
    },
  }))
  .case(updateUncommonProcessesLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...get(`${hostsType}`, state),
      queries: {
        ...get(`${hostsType}.queries`, state),
        uncommonProcesses: {
          limit,
        },
      },
    },
  }))
  .case(setHostsFilterQueryDraft, (state, { filterQueryDraft, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...get(`${hostsType}`, state),
      filterQueryDraft,
    },
  }))
  .case(applyHostsFilterQuery, (state, { filterQuery, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...get(`${hostsType}`, state),
      filterQueryDraft: filterQuery.query,
      filterQuery,
    },
  }))
  .build();
