/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreSortField, RiskSeverity } from '../../../common/search_strategy';

export enum UsersType {
  page = 'page',
  details = 'details',
}

export enum UsersTableType {
  allUsers = 'allUsers',
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

export type AllUsersQuery = BasicQueryPaginated;

export interface UsersRiskScoreQuery extends BasicQueryPaginated {
  sort: RiskScoreSortField; // TODO fix it when be is implemented
  severitySelection: RiskSeverity[];
}

export interface UsersQueries {
  [UsersTableType.allUsers]: AllUsersQuery;
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
