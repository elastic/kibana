/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EncryptedSyntheticsSavedMonitor,
  FetchMonitorManagementListQueryArgs,
} from '../../../../../common/runtime_types';

export type MonitorListSortField = `${keyof EncryptedSyntheticsSavedMonitor}.keyword` | 'enabled';

export interface MonitorListPageState {
  query?: string;
  pageIndex: number;
  pageSize: number;
  sortField: MonitorListSortField;
  sortOrder: NonNullable<FetchMonitorManagementListQueryArgs['sortOrder']>;
  tags?: string[];
  monitorType?: string[];
  locations?: string[];
}
