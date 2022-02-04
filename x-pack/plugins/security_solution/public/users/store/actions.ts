/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import { usersModel } from '.';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/users');

export const updateUsersTable = actionCreator<{
  usersType: usersModel.UsersType;
  tableType: usersModel.UsersTableType | usersModel.UsersTableType;
  updates: usersModel.TableUpdates;
}>('UPDATE_NETWORK_TABLE');

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
