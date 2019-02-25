/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { NetworkTopNFlowDirection, NetworkTopNFlowType } from '../../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';
import { NetworkType } from './model';

const actionCreator = actionCreatorFactory('x-pack/secops/local/network');

export const updateTopNFlowLimit = actionCreator<{ limit: number; networkType: NetworkType }>(
  'UPDATE_TOP_N_FLOW_LIMIT'
);

export const updateTopNFlowType = actionCreator<{
  topNFlowType: NetworkTopNFlowType;
  networkType: NetworkType;
}>('UPDATE_TOP_N_FLOW_TYPE');

export const updateTopNFlowDirection = actionCreator<{
  topNFlowDirection: NetworkTopNFlowDirection;
  networkType: NetworkType;
}>('UPDATE_TOP_N_FLOW_DIRECTION');

export const setNetworkFilterQueryDraft = actionCreator<{
  filterQueryDraft: KueryFilterQuery;
  networkType: NetworkType;
}>('SET_NETWORK_FILTER_QUERY_DRAFT');

export const applyNetworkFilterQuery = actionCreator<{
  filterQuery: SerializedFilterQuery;
  networkType: NetworkType;
}>('APPLY_NETWORK_FILTER_QUERY');
