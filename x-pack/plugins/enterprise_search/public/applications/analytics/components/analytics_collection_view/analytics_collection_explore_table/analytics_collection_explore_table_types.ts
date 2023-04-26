/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ExploreTables {
  SearchTerms,
  WorsePerformers,
  TopClicked,
  TopReferrers,
}

export enum ExploreTableColumns {
  count = 'count',
  searchTerms = 'searchTerms',
  query = 'query',
  page = 'page',
  sessions = 'sessions',
}

export interface SearchTermsTable {
  [ExploreTableColumns.count]: number;
  [ExploreTableColumns.searchTerms]: string;
}

export interface WorsePerformersTable {
  [ExploreTableColumns.count]: number;
  [ExploreTableColumns.query]: string;
}

export interface TopClickedTable {
  [ExploreTableColumns.count]: number;
  [ExploreTableColumns.page]: string;
}

export interface TopReferrersTable {
  [ExploreTableColumns.page]: string;
  [ExploreTableColumns.sessions]: number;
}

export type ExploreTableItem =
  | SearchTermsTable
  | WorsePerformersTable
  | TopClickedTable
  | TopReferrersTable;
