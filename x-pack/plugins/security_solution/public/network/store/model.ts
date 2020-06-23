/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FlowTarget,
  NetworkDnsSortField,
  NetworkHttpSortField,
  NetworkTopTablesSortField,
  TlsSortField,
  UsersSortField,
} from '../../graphql/types';

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
  | IpDetailsTableType.topNFlowDestination
  | IpDetailsTableType.topNFlowSource
  | NetworkTableType.topNFlowDestination
  | NetworkTableType.topNFlowSource;

export type TopCountriesTableType =
  | IpDetailsTableType.topCountriesDestination
  | IpDetailsTableType.topCountriesSource
  | NetworkTableType.topCountriesDestination
  | NetworkTableType.topCountriesSource;

export type TopTlsTableType = IpDetailsTableType.tls | NetworkTableType.tls;

export type HttpTableType = IpDetailsTableType.http | NetworkTableType.http;

export enum IpDetailsTableType {
  http = 'http',
  tls = 'tls',
  topCountriesDestination = 'topCountriesDestination',
  topCountriesSource = 'topCountriesSource',
  topNFlowDestination = 'topNFlowDestination',
  topNFlowSource = 'topNFlowSource',
  users = 'users',
}

export type AllNetworkTables = NetworkTableType | IpDetailsTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

// Network Page Models
export interface TopNFlowQuery extends BasicQueryPaginated {
  sort: NetworkTopTablesSortField;
}

export interface TopCountriesQuery extends BasicQueryPaginated {
  sort: NetworkTopTablesSortField;
}

export interface DnsQuery extends BasicQueryPaginated {
  sort: NetworkDnsSortField;
  isPtrIncluded: boolean;
}

export interface TlsQuery extends BasicQueryPaginated {
  sort: TlsSortField;
}

export interface HttpQuery extends BasicQueryPaginated {
  sort: NetworkHttpSortField;
}

export interface TableUpdates {
  activePage?: number;
  limit?: number;
  isPtrIncluded?: boolean;
  sort?:
    | NetworkDnsSortField
    | NetworkHttpSortField
    | NetworkTopTablesSortField
    | TlsSortField
    | UsersSortField;
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

export interface UsersQuery extends BasicQueryPaginated {
  sort: UsersSortField;
}

export interface IpOverviewQueries {
  [IpDetailsTableType.http]: HttpQuery;
  [IpDetailsTableType.tls]: TlsQuery;
  [IpDetailsTableType.topCountriesDestination]: TopCountriesQuery;
  [IpDetailsTableType.topCountriesSource]: TopCountriesQuery;
  [IpDetailsTableType.topNFlowDestination]: TopNFlowQuery;
  [IpDetailsTableType.topNFlowSource]: TopNFlowQuery;
  [IpDetailsTableType.users]: UsersQuery;
}

export interface NetworkDetailsModel {
  flowTarget: FlowTarget;
  queries: IpOverviewQueries;
}

export interface NetworkModel {
  [NetworkType.page]: NetworkPageModel;
  [NetworkType.details]: NetworkDetailsModel;
}
