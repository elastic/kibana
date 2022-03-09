/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { State } from '../../common/store/types';

import { UsersPageModel, UsersTableType } from './model';

const selectUserPage = (state: State): UsersPageModel => state.users.page;

export const allUsersSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.allUsers]);

export const userRiskScoreSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.risk]);

export const usersRiskScoreSeverityFilterSelector = () =>
  createSelector(selectUserPage, (users) => users.queries[UsersTableType.risk].severitySelection);
