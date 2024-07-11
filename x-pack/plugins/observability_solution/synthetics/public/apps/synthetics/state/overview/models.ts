/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MonitorListSortField } from '../../../../../common/runtime_types/monitor_management/sort_field';
import { ConfigKey, MonitorOverviewResult } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';
import { MonitorFilterState } from '../monitor_list';

export interface MonitorOverviewPageState extends MonitorFilterState {
  perPage: number;
  sortOrder: 'asc' | 'desc';
  sortField: MonitorListSortField;
}

export type MonitorOverviewFlyoutConfig = {
  configId: string;
  id: string;
  location: string;
  locationId: string;
} | null;

export interface MonitorOverviewState {
  flyoutConfig: MonitorOverviewFlyoutConfig;
  data: MonitorOverviewResult;
  pageState: MonitorOverviewPageState;
  loading: boolean;
  loaded: boolean;
  isErrorPopoverOpen?: string | null;
  error: IHttpSerializedFetchError | null;
  groupBy: GroupByState;
  trendStats: TrendTable;
}

export interface GroupByState {
  field: ConfigKey.TAGS | ConfigKey.PROJECT_ID | ConfigKey.MONITOR_TYPE | 'locationId' | 'none';
  order: 'asc' | 'desc';
}

export interface TrendDatum {
  x: number;
  y: number;
}

export interface OverviewTrend {
  configId: string;
  locationId: string;
  data: TrendDatum[];
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  median: number;
}

export type TrendTable = Record<string, OverviewTrend | null>;
