/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopTablesFields,
  NetworkTlsFields,
  NetworkUsersFields,
  SortField,
} from '../../../common/search_strategy';

export enum NetworkType {
  page = 'page',
  details = 'details',
}

export enum NetworkTableType {
  alerts = 'alerts',
  dns = 'dns',
  http = 'http',
  topCountriesDestination = 'topCountriesDestination',
  topCountriesSource = 'topCountriesSource',
  topNFlowDestination = 'topNFlowDestination',
  topNFlowSource = 'topNFlowSource',
  tls = 'tls',
}

export type TopNTableType =
  | NetworkDetailsTableType.topNFlowDestination
  | NetworkDetailsTableType.topNFlowSource
  | NetworkTableType.topNFlowDestination
  | NetworkTableType.topNFlowSource;

export type TopCountriesTableType =
  | NetworkDetailsTableType.topCountriesDestination
  | NetworkDetailsTableType.topCountriesSource
  | NetworkTableType.topCountriesDestination
  | NetworkTableType.topCountriesSource;

export type TopTlsTableType = NetworkDetailsTableType.tls | NetworkTableType.tls;

export type HttpTableType = NetworkDetailsTableType.http | NetworkTableType.http;

export enum NetworkDetailsTableType {
  http = 'http',
  tls = 'tls',
  topCountriesDestination = 'topCountriesDestination',
  topCountriesSource = 'topCountriesSource',
  topNFlowDestination = 'topNFlowDestination',
  topNFlowSource = 'topNFlowSource',
  users = 'users',
}

export type AllNetworkTables = NetworkTableType | NetworkDetailsTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

// Network Page Models
export interface TopNFlowQuery extends BasicQueryPaginated {
  sort: SortField<NetworkTopTablesFields>;
}

export interface TopCountriesQuery extends BasicQueryPaginated {
  sort: SortField<NetworkTopTablesFields>;
}

export interface DnsQuery extends BasicQueryPaginated {
  sort: SortField<NetworkDnsFields>;
  isPtrIncluded: boolean;
}

export interface TlsQuery extends BasicQueryPaginated {
  sort: SortField<NetworkTlsFields>;
}

export interface HttpQuery extends BasicQueryPaginated {
  sort: {
    direction: Direction;
  };
}

export interface TableUpdates {
  activePage?: number;
  limit?: number;
  isPtrIncluded?: boolean;
  sort?:
    | SortField<NetworkDnsFields>
    | HttpQuery['sort']
    | SortField<NetworkTopTablesFields>
    | SortField<NetworkTlsFields>
    | SortField<NetworkUsersFields>;
}

export interface NetworkQueries {
  [NetworkTableType.dns]: DnsQuery;
  [NetworkTableType.http]: HttpQuery;
  [NetworkTableType.topCountriesDestination]: TopCountriesQuery;
  [NetworkTableType.topCountriesSource]: TopCountriesQuery;
  [NetworkTableType.topNFlowDestination]: TopNFlowQuery;
  [NetworkTableType.topNFlowSource]: TopNFlowQuery;
  [NetworkTableType.tls]: TlsQuery;
  [NetworkTableType.alerts]: BasicQueryPaginated;
}

export interface NetworkPageModel {
  queries: NetworkQueries;
}

export interface NetworkUsersQuery extends BasicQueryPaginated {
  sort: SortField<NetworkUsersFields>;
}

export interface NetworkDetailsQueries {
  [NetworkDetailsTableType.http]: HttpQuery;
  [NetworkDetailsTableType.tls]: TlsQuery;
  [NetworkDetailsTableType.topCountriesDestination]: TopCountriesQuery;
  [NetworkDetailsTableType.topCountriesSource]: TopCountriesQuery;
  [NetworkDetailsTableType.topNFlowDestination]: TopNFlowQuery;
  [NetworkDetailsTableType.topNFlowSource]: TopNFlowQuery;
  [NetworkDetailsTableType.users]: NetworkUsersQuery;
}

export interface NetworkDetailsModel {
  flowTarget: FlowTarget;
  queries: NetworkDetailsQueries;
}

export interface NetworkModel {
  [NetworkType.page]: NetworkPageModel;
  [NetworkType.details]: NetworkDetailsModel;
}
