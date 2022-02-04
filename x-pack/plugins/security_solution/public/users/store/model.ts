/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreFields, RiskScoreSortField, SortField } from '../../../common/search_strategy';

export enum UsersType {
  page = 'page',
}

export enum UsersTableType {
  riskScore = 'riskScore',
}

export type AllUsersTables = UsersTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export interface RiskScoreQuery extends BasicQueryPaginated {
  sort: RiskScoreSortField;
}

export interface TableUpdates {
  activePage?: number;
  limit?: number;
  isPtrIncluded?: boolean;
  sort?: SortField<RiskScoreFields>;
}

export interface UsersQueries {
  [UsersTableType.riskScore]: RiskScoreQuery;
}

export interface UsersPageModel {
  queries: UsersQueries;
}

export interface UsersModel {
  [UsersType.page]: UsersPageModel;
}
