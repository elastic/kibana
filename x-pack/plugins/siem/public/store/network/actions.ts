/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import {
  IpOverviewType,
  NetworkDnsSortField,
  NetworkTopNFlowDirection,
  NetworkTopNFlowSortField,
  NetworkTopNFlowType,
} from '../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';

import { NetworkType } from './model';

const actionCreator = actionCreatorFactory('x-pack/siem/local/network');

export const updateDnsLimit = actionCreator<{
  limit: number;
  networkType: NetworkType;
}>('UPDATE_DNS_LIMIT');

export const updateDnsSort = actionCreator<{
  dnsSortField: NetworkDnsSortField;
  networkType: NetworkType;
}>('UPDATE_DNS_SORT');

export const updateIsPtrIncluded = actionCreator<{
  isPtrIncluded: boolean;
  networkType: NetworkType;
}>('UPDATE_DNS_IS_PTR_INCLUDED');

export const updateTopNFlowLimit = actionCreator<{
  limit: number;
  networkType: NetworkType;
}>('UPDATE_TOP_N_FLOW_LIMIT');

export const updateTopNFlowSort = actionCreator<{
  topNFlowSort: NetworkTopNFlowSortField;
  networkType: NetworkType;
}>('UPDATE_TOP_N_FLOW_SORT');

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

// IP Overview Actions
export const updateIpOverviewFlowType = actionCreator<{
  flowType: IpOverviewType;
}>('UPDATE_IP_OVERVIEW_FLOW_TYPE');
