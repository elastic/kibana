/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import {
  DomainsSortField,
  FlowDirection,
  FlowTarget,
  NetworkDnsSortField,
  NetworkTopNFlowSortField,
  TlsSortField,
  UsersSortField,
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

export const updateTopNFlowTarget = actionCreator<{
  flowTarget: FlowTarget;
}>('UPDATE_TOP_N_FLOW_TARGET');

export const updateTopNFlowDirection = actionCreator<{
  flowDirection: FlowDirection;
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

// IP Details Actions
export const updateIpDetailsFlowTarget = actionCreator<{
  flowTarget: FlowTarget;
}>('UPDATE_IP_DETAILS_TARGET');

// Domains Table Actions
export const updateDomainsLimit = actionCreator<{
  limit: number;
}>('UPDATE_DOMAINS_LIMIT');

export const updateDomainsFlowDirection = actionCreator<{
  flowDirection: FlowDirection;
}>('UPDATE_DOMAINS_DIRECTION');

export const updateDomainsSort = actionCreator<{
  domainsSortField: DomainsSortField;
}>('UPDATE_DOMAINS_SORT');

// TLS Table Actions
export const updateTlsSort = actionCreator<{
  tlsSortField: TlsSortField;
}>('UPDATE_TLS_SORT');

export const updateTlsLimit = actionCreator<{
  limit: number;
}>('UPDATE_TLS_LIMIT');

// Users Table Actions
export const updateUsersLimit = actionCreator<{
  limit: number;
}>('UPDATE_USERS_LIMIT');

export const updateUsersSort = actionCreator<{
  usersSortField: UsersSortField;
}>('UPDATE_USERS_SORT');
