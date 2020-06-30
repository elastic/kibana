/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsTableType } from '../../../hosts/store/model';

import { appendSearch } from './helpers';

export const getHostsUrl = (search?: string) => `${appendSearch(search)}`;

export const getTabsOnHostsUrl = (tabName: HostsTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;

export const getHostDetailsUrl = (detailName: string, search?: string) =>
  `/${detailName}${appendSearch(search)}`;

export const getTabsOnHostDetailsUrl = (
  detailName: string,
  tabName: HostsTableType,
  search?: string
) => `/${detailName}/${tabName}${appendSearch(search)}`;
