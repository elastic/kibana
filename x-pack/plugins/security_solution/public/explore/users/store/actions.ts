/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { usersModel } from '.';
import type { RiskScoreSortField, RiskSeverity } from '../../../../common/search_strategy';
import type { SortUsersField } from '../../../../common/search_strategy/security_solution/users/common';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/users');

export const setUsersTablesActivePageToZero = actionCreator('SET_USERS_TABLES_ACTIVE_PAGE_TO_ZERO');

export const setUsersDetailsTablesActivePageToZero = actionCreator(
  'SET_USERS_DETAILS_TABLES_ACTIVE_PAGE_TO_ZERO'
);

export const updateTableLimit = actionCreator<{
  usersType: usersModel.UsersType;
  limit: number;
  tableType: usersModel.UsersTableType;
}>('UPDATE_USERS_TABLE_LIMIT');

export const updateTableActivePage = actionCreator<{
  usersType: usersModel.UsersType;
  activePage: number;
  tableType: usersModel.UsersTableType;
}>('UPDATE_USERS_ACTIVE_PAGE');

export const updateTableSorting = actionCreator<{
  tableType: usersModel.UsersTableType;
  sort: RiskScoreSortField | SortUsersField;
}>('UPDATE_USERS_SORTING');

export const updateUserRiskScoreSeverityFilter = actionCreator<{
  severitySelection: RiskSeverity[];
}>('UPDATE_USERS_RISK_SEVERITY_FILTER');

export const updateUsersAnomaliesJobIdFilter = actionCreator<{
  jobIds: string[];
  usersType: usersModel.UsersType;
}>('UPDATE_USERS_ANOMALIES_JOB_ID_FILTER');

export const updateUsersAnomaliesInterval = actionCreator<{
  interval: string;
  usersType: usersModel.UsersType;
}>('UPDATE_USERS_ANOMALIES_INTERVAL');
