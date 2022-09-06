/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError } from '@kbn/core-http-browser';
import { createAction } from '@reduxjs/toolkit';
import {
  EncryptedSyntheticsMonitor,
  MonitorManagementListResult,
  MonitorOverviewItem,
} from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

import { MonitorListPageState } from './models';

export const fetchMonitorListAction = createAsyncAction<
  MonitorListPageState,
  MonitorManagementListResult
>('fetchMonitorListAction');

export interface UpsertMonitorRequest {
  id: string;
  monitor: EncryptedSyntheticsMonitor | MonitorOverviewItem;
}
export const fetchUpsertMonitorAction = createAction<UpsertMonitorRequest>('fetchUpsertMonitor');
export const fetchUpsertSuccessAction = createAction<{
  id: string;
  attributes: { enabled: boolean };
}>('fetchUpsertMonitorSuccess');
export const fetchUpsertFailureAction = createAction<{ id: string; error: IHttpFetchError }>(
  'fetchUpsertMonitorFailure'
);
export const clearMonitorUpsertStatus = createAction<string>('clearMonitorUpsertStatus');
