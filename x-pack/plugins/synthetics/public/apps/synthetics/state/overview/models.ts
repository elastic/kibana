/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MonitorOverviewResult, OverviewStatusState } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

export interface MonitorOverviewPageState {
  perPage: number;
  query?: string;
  tags?: string[];
  monitorType?: string[];
  locations?: string[];
  projects?: string[];
  sortOrder: 'asc' | 'desc';
  sortField: string;
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
  error: IHttpSerializedFetchError | null;
  status: OverviewStatusState | null;
  statusError: IHttpSerializedFetchError | null;
}
