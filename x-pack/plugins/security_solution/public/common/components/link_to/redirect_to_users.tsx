/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersTableType } from '../../../users/store/model';
import { USERS_PATH } from '../../../../common/constants';
import { appendSearch } from './helpers';

export const getUsersUrl = (search?: string) => `${USERS_PATH}${appendSearch(search)}`;

export const getTabsOnUsersUrl = (tabName: UsersTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;

export const getUsersDetailsUrl = (detailName: string, search?: string) =>
  `/${detailName}${appendSearch(search)}`;

export const getTabsOnUsersDetailsUrl = (
  detailName: string,
  tabName: UsersTableType,
  search?: string
) => `/${detailName}/${tabName}${appendSearch(search)}`;
