/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum UsersType {
  page = 'page',
  details = 'details',
}

export enum UsersTableType {
  allUsers = 'allUsers',
}

export type AllUsersTables = UsersTableType;

export interface BasicQueryPaginated {
  activePage: number;
  limit: number;
}

export type AllUsersQuery = BasicQueryPaginated;

export interface TableUpdates {
  activePage?: number;
  limit?: number;
  isPtrIncluded?: boolean;
  // sort?: SortField<AllUsersFields>;
}

export interface UsersQueries {
  [UsersTableType.allUsers]: AllUsersQuery;
}

export interface UsersPageModel {
  queries: UsersQueries;
}

export interface UsersDetailsQueries {
  [UsersTableType.allUsers]: AllUsersQuery;
}

export interface UsersDetailsModel {
  queries: UsersDetailsQueries;
}

export interface UsersModel {
  [UsersType.page]: UsersPageModel;
  [UsersType.details]: UsersPageModel;
}
