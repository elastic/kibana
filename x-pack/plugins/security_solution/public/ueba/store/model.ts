/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  // UebaTopTablesFields,
  SortField,
} from '../../../common/search_strategy';
export interface UebaTopTablesFields {}
export enum UebaType {
  page = 'page',
  details = 'details',
}

export enum UebaTableType {
  riskScore = 'riskScore',
}

export type TopNTableType = UebaDetailsTableType.riskScore | UebaTableType.riskScore;

export enum UebaDetailsTableType {
  riskScore = 'riskScore',
}

export type AllUebaTables = UebaTableType | UebaDetailsTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

// Ueba Page Models
export interface TopNFlowQuery extends BasicQueryPaginated {
  sort: SortField<UebaTopTablesFields>;
}

export interface TableUpdates {
  activePage?: number;
  limit?: number;
  isPtrIncluded?: boolean;
  sort?: SortField<UebaTopTablesFields>;
}

export interface UebaQueries {
  [UebaTableType.riskScore]: TopNFlowQuery;
}

export interface UebaPageModel {
  queries: UebaQueries;
}

export interface UebaDetailsQueries {
  [UebaDetailsTableType.riskScore]: TopNFlowQuery;
}

export interface UebaDetailsModel {
  queries: UebaDetailsQueries;
}

export interface UebaModel {
  [UebaType.page]: UebaPageModel;
  [UebaType.details]: UebaDetailsModel;
}
