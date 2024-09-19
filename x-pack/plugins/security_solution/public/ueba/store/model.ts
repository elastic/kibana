/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HostRulesSortField,
  HostTacticsSortField,
  RiskScoreFields,
  RiskScoreSortField,
  SortField,
  UserRulesSortField,
} from '../../../common/search_strategy';

export enum UebaType {
  page = 'page',
  details = 'details',
}

export enum UebaTableType {
  riskScore = 'riskScore',
  hostRules = 'hostRules',
  hostTactics = 'hostTactics',
  userRules = 'userRules',
}

export type AllUebaTables = UebaTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

// Ueba Page Models
export interface RiskScoreQuery extends BasicQueryPaginated {
  sort: RiskScoreSortField;
}
export interface HostRulesQuery extends BasicQueryPaginated {
  sort: HostRulesSortField;
}
export interface UserRulesQuery extends BasicQueryPaginated {
  sort: UserRulesSortField;
}
export interface HostTacticsQuery extends BasicQueryPaginated {
  sort: HostTacticsSortField;
}

export interface TableUpdates {
  activePage?: number;
  limit?: number;
  isPtrIncluded?: boolean;
  sort?: SortField<RiskScoreFields>;
}

export interface UebaQueries {
  [UebaTableType.riskScore]: RiskScoreQuery;
}

export interface UebaPageModel {
  queries: UebaQueries;
}

export interface UebaDetailsQueries {
  [UebaTableType.hostRules]: HostRulesQuery;
  [UebaTableType.hostTactics]: HostTacticsQuery;
  [UebaTableType.userRules]: UserRulesQuery;
}

export interface UebaDetailsModel {
  queries: UebaDetailsQueries;
}

export interface UebaModel {
  [UebaType.page]: UebaPageModel;
  [UebaType.details]: UebaDetailsModel;
}
