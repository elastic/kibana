/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostsTableType } from '../../../explore/hosts/store/model';
import { HOSTS_PATH } from '../../../../common/constants';
import { appendSearch } from './helpers';

export const getHostsUrl = (search?: string) => `${HOSTS_PATH}${appendSearch(search)}`;

export const getTabsOnHostsUrl = (tabName: HostsTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;

export const getHostDetailsUrl = (detailName: string, search?: string) =>
  `/name/${detailName}${appendSearch(search)}`;

export const getTabsOnHostDetailsUrl = (
  detailName: string,
  tabName: HostsTableType,
  search?: string
) => `/name/${detailName}/${tabName}${appendSearch(search)}`;
