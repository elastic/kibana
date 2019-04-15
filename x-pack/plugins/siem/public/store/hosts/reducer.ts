/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { Direction, HostsFields } from '../../graphql/types';
import { DEFAULT_TABLE_LIMIT } from '../constants';

import {
  applyHostsFilterQuery,
  setHostsFilterQueryDraft,
  updateAuthenticationsLimit,
  updateEventsLimit,
  updateHostsLimit,
  updateHostsSort,
  updateUncommonProcessesLimit,
} from './actions';
import { HostsModel } from './model';

export type HostsState = HostsModel;

export const initialHostsState: HostsState = {
  page: {
    queries: {
      authentications: { limit: DEFAULT_TABLE_LIMIT },
      hosts: {
        limit: DEFAULT_TABLE_LIMIT,
        direction: Direction.desc,
        sortField: HostsFields.lastSeen,
      },
      events: { limit: DEFAULT_TABLE_LIMIT },
      uncommonProcesses: { limit: DEFAULT_TABLE_LIMIT },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
  details: {
    queries: {
      authentications: { limit: DEFAULT_TABLE_LIMIT },
      hosts: {
        limit: DEFAULT_TABLE_LIMIT,
        direction: Direction.desc,
        sortField: HostsFields.lastSeen,
      },
      events: { limit: DEFAULT_TABLE_LIMIT },
      uncommonProcesses: { limit: DEFAULT_TABLE_LIMIT },
    },
    filterQuery: null,
    filterQueryDraft: null,
  },
};

export const hostsReducer = reducerWithInitialState(initialHostsState)
  .case(updateAuthenticationsLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        authentications: {
          limit,
        },
      },
    },
  }))
  .case(updateHostsLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        hosts: {
          ...state[hostsType].queries.hosts,
          limit,
        },
      },
    },
  }))
  .case(updateHostsSort, (state, { sort, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        hosts: {
          ...state[hostsType].queries.hosts,
          direction: sort.direction,
          sortField: sort.field,
        },
      },
    },
  }))
  .case(updateEventsLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        events: {
          limit,
        },
      },
    },
  }))
  .case(updateUncommonProcessesLimit, (state, { limit, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      queries: {
        ...state[hostsType].queries,
        uncommonProcesses: {
          limit,
        },
      },
    },
  }))
  .case(setHostsFilterQueryDraft, (state, { filterQueryDraft, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      filterQueryDraft,
    },
  }))
  .case(applyHostsFilterQuery, (state, { filterQuery, hostsType }) => ({
    ...state,
    [hostsType]: {
      ...state[hostsType],
      filterQueryDraft: filterQuery.query,
      filterQuery,
    },
  }))
  .build();
