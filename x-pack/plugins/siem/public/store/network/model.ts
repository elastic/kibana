/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTarget,
  NetworkDnsSortField,
  NetworkTopNFlowDirection,
  NetworkTopNFlowSortField,
  NetworkTopNFlowType,
} from '../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';

export enum NetworkType {
  page = 'page',
  details = 'details',
}

export interface BasicQuery {
  limit: number;
}

// Network Page Models
export interface TopNFlowQuery extends BasicQuery {
  topNFlowType: NetworkTopNFlowType;
  topNFlowSort: NetworkTopNFlowSortField;
  topNFlowDirection: NetworkTopNFlowDirection;
}

export interface DnsQuery extends BasicQuery {
  dnsSortField: NetworkDnsSortField;
  isPtrIncluded: boolean;
}

interface NetworkQueries {
  topNFlow: TopNFlowQuery;
  dns: DnsQuery;
}

export interface NetworkPageModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  queries: NetworkQueries;
}

// IP Details Models
export interface IpOverviewQuery {
  flowTarget: FlowTarget;
}

interface IpOverviewQueries {
  ipOverview: IpOverviewQuery;
}

export interface NetworkDetailsModel {
  filterQuery: SerializedFilterQuery | null;
  filterQueryDraft: KueryFilterQuery | null;
  queries: IpOverviewQueries;
}

// Network Model
export interface NetworkModel {
  [NetworkType.page]: NetworkPageModel;
  [NetworkType.details]: NetworkDetailsModel;
}
