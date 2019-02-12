/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';
import { NetworkType } from './model';

const actionCreator = actionCreatorFactory('x-pack/secops/local/network');

export const updateTopSourceLimit = actionCreator<{ limit: number; networkType: NetworkType }>(
  'UPDATE_TOP_SOURCE_LIMIT'
);

export const updateTopDestinationLimit = actionCreator<{ limit: number; networkType: NetworkType }>(
  'UPDATE_TOP_DESTINATION_LIMIT'
);

export const setNetworkFilterQueryDraft = actionCreator<{
  filterQueryDraft: KueryFilterQuery;
  networkType: NetworkType;
}>('SET_NETWORK_FILTER_QUERY_DRAFT');

export const applyNetworkFilterQuery = actionCreator<{
  filterQuery: SerializedFilterQuery;
  networkType: NetworkType;
}>('APPLY_NETWORK_FILTER_QUERY');
