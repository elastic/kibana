/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import type { State } from '../../../common/store/types';

import type {
  UserAssetQuery,
  UserDetailsPageModel,
  UserFlyoutQueries,
  UserAssetTableType,
  UsersPageModel,
} from './model';
import { UsersTableType, UsersType } from './model';

const selectUserPage = (state: State): UsersPageModel => state.users.page;

const selectUsersAndDetailsPage = (
  state: State,
  usersType: UsersType
): UsersPageModel | UserDetailsPageModel | null => {
  if (usersType === UsersType.details || usersType === UsersType.page) {
    return state.users[usersType];
  }
  return null;
};

export const allUsersSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.allUsers]);

export const userRiskScoreSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.risk]);

export const userRiskScoreSeverityFilterSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.risk].severitySelection);

export const authenticationsSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.authentications]);

export const usersAnomaliesJobIdFilterSelector = () =>
  createSelector(
    selectUsersAndDetailsPage,
    (users) => users?.queries[UsersTableType.anomalies].jobIdSelection ?? []
  );

export const usersAnomaliesIntervalSelector = () =>
  createSelector(
    selectUsersAndDetailsPage,
    (users) => users?.queries[UsersTableType.anomalies].intervalSelection ?? 'auto'
  );

export const selectUserAssetTableById = (
  state: State,
  tableId: UserAssetTableType
): UserAssetQuery => state.users.flyout.queries[tableId];

export const selectUserAssetTables = (state: State): UserFlyoutQueries =>
  state.users.flyout.queries;
