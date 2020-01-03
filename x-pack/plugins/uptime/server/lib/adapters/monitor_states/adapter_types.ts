/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MonitorSummary,
  CursorDirection,
  SortOrder,
  StatesIndexStatus,
} from '../../../../../../legacy/plugins/uptime/common/graphql/types';
import { UMElasticsearchQueryFn } from '../framework';
import { Snapshot } from '../../../../../../legacy/plugins/uptime/common/runtime_types';

export interface MonitorStatesParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination?: CursorPagination;
  filters?: string | null;
  statusFilter?: string;
}

export interface GetSnapshotCountParams {
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string | null;
  statusFilter?: string;
}

export interface UMMonitorStatesAdapter {
  getMonitorStates: UMElasticsearchQueryFn<MonitorStatesParams, GetMonitorStatesResult>;
  getSnapshotCount: UMElasticsearchQueryFn<GetSnapshotCountParams, Snapshot>;
  statesIndexExists: UMElasticsearchQueryFn<{}, StatesIndexStatus>;
}

export interface CursorPagination {
  cursorKey?: any;
  cursorDirection: CursorDirection;
  sortOrder: SortOrder;
}

export interface GetMonitorStatesResult {
  summaries: MonitorSummary[];
  nextPagePagination: string | null;
  prevPagePagination: string | null;
}

export interface LegacyMonitorStatesQueryResult {
  result: any;
  statusFilter?: any;
  searchAfter: any;
}

export interface MonitorStatesCheckGroupsResult {
  checkGroups: string[];
  searchAfter: any;
}

export interface EnrichMonitorStatesResult {
  monitors: any[];
  nextPagePagination: any | null;
  prevPagePagination: any | null;
}
