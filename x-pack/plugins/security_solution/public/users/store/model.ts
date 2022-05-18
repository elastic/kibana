/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreSortField, RiskSeverity } from '../../../common/search_strategy';
import { SortUsersField } from '../../../common/search_strategy/security_solution/users/common';

export enum UsersType {
  page = 'page',
  details = 'details',
}

export enum UsersTableType {
  allUsers = 'allUsers',
  authentications = 'authentications',
  anomalies = 'anomalies',
  risk = 'userRisk',
  events = 'events',
  alerts = 'externalAlerts',
}

export type AllUsersTables = UsersTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface AllUsersQuery extends BasicQueryPaginated {
  sort: SortUsersField;
}

export interface UsersRiskScoreQuery extends BasicQueryPaginated {
  sort: RiskScoreSortField;
  severitySelection: RiskSeverity[];
}

export interface UsersQueries {
  [UsersTableType.allUsers]: AllUsersQuery;
  [UsersTableType.authentications]: BasicQueryPaginated;
  [UsersTableType.anomalies]: null | undefined;
  [UsersTableType.risk]: UsersRiskScoreQuery;
  [UsersTableType.events]: BasicQueryPaginated;
  [UsersTableType.alerts]: BasicQueryPaginated;
}

export interface UserDetailsQueries {
  [UsersTableType.anomalies]: null | undefined;
  [UsersTableType.events]: BasicQueryPaginated;
  [UsersTableType.alerts]: BasicQueryPaginated;
}

export interface UsersPageModel {
  queries: UsersQueries;
}

export interface UserDetailsPageModel {
  queries: UserDetailsQueries;
}

export interface UsersDetailsQueries {
  [UsersTableType.allUsers]: AllUsersQuery;
}

export interface UsersDetailsModel {
  queries: UsersDetailsQueries;
}

export interface UsersModel {
  [UsersType.page]: UsersPageModel;
  [UsersType.details]: UserDetailsPageModel;
}
