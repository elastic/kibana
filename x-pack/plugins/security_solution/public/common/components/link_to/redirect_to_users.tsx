/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsersTableType } from '../../../explore/users/store/model';
import { appendSearch } from './helpers';

export const getUsersDetailsUrl = (detailName: string, search?: string) =>
  `/name/${detailName}${appendSearch(search)}`;

export const getTabsOnUsersDetailsUrl = (
  detailName: string,
  tabName: UsersTableType,
  search?: string
) => `/name/${detailName}/${tabName}${appendSearch(search)}`;

export const getTabsOnUsersUrl = (tabName: UsersTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;
