/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import type { State } from '../../../common/store/types';

import type { UserDetailsPageModel, UsersPageModel, UsersType } from './model';
import { UsersTableType } from './model';

const selectUserPage = (state: State): UsersPageModel => state.users.page;

const selectUsers = (state: State, usersType: UsersType): UsersPageModel | UserDetailsPageModel =>
  state.users[usersType];

export const allUsersSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.allUsers]);

export const userRiskScoreSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.risk]);

export const userRiskScoreSeverityFilterSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.risk].severitySelection);

export const authenticationsSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.authentications]);

export const usersAnomaliesJobIdFilterSelector = () =>
  createSelector(selectUsers, (users) => users.queries[UsersTableType.anomalies].jobIdSelection);

export const usersAnomaliesIntervalSelector = () =>
  createSelector(selectUsers, (users) => users.queries[UsersTableType.anomalies].intervalSelection);
