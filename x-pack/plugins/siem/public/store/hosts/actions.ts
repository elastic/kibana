/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { HostsSortField } from '../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';

import { HostsType } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/hosts');

export const updateAuthenticationsLimit = actionCreator<{ limit: number; hostsType: HostsType }>(
  'UPDATE_AUTHENTICATIONS_LIMIT'
);

export const updateHostsLimit = actionCreator<{ limit: number; hostsType: HostsType }>(
  'UPDATE_HOSTS_LIMIT'
);

export const updateHostsSort = actionCreator<{
  sort: HostsSortField;
  hostsType: HostsType;
}>('UPDATE_HOSTS_SORT');

export const updateEventsLimit = actionCreator<{ limit: number; hostsType: HostsType }>(
  'UPDATE_EVENTS_LIMIT'
);

export const updateUncommonProcessesLimit = actionCreator<{ limit: number; hostsType: HostsType }>(
  'UPDATE_UNCOMMONPROCESSES_LIMIT'
);

export const setHostsFilterQueryDraft = actionCreator<{
  filterQueryDraft: KueryFilterQuery;
  hostsType: HostsType;
}>('SET_HOSTS_FILTER_QUERY_DRAFT');

export const applyHostsFilterQuery = actionCreator<{
  filterQuery: SerializedFilterQuery;
  hostsType: HostsType;
}>('APPLY_HOSTS_FILTER_QUERY');
