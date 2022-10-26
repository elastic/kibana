/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MonitorOverviewResult, OverviewStatus } from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

export interface MonitorOverviewPageState {
  perPage: number;
  query?: string;
  tags?: string[];
  monitorType?: string[];
  locations?: string[];
  sortOrder: 'asc' | 'desc';
  sortField: string;
}

export interface MonitorOverviewState {
  data: MonitorOverviewResult;
  pageState: MonitorOverviewPageState;
  loading: boolean;
  loaded: boolean;
  error: IHttpSerializedFetchError | null;
  status: OverviewStatus | null;
  statusError: IHttpSerializedFetchError | null;
}
