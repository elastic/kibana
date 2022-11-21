/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorToastOptions } from '@kbn/core-notifications-browser';
import { createAction } from '@reduxjs/toolkit';
import {
  EncryptedSyntheticsMonitor,
  MonitorManagementListResult,
} from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';
import { IHttpSerializedFetchError } from '../utils/http_error';

import { MonitorListPageState } from './models';

export const fetchMonitorListAction = createAsyncAction<
  MonitorListPageState,
  MonitorManagementListResult
>('fetchMonitorListAction');

interface ToastParams<MessageType> {
  message: MessageType;
  lifetimeMs: number;
  testAttribute?: string;
}

export interface UpsertMonitorRequest {
  id: string;
  monitor: Partial<EncryptedSyntheticsMonitor>;
  success: ToastParams<string>;
  error: ToastParams<ErrorToastOptions>;
  /**
   * The effect will perform a quiet refresh of the overview state
   * after a successful upsert. The default behavior is to perform the fetch.
   */
  shouldQuietFetchAfterSuccess?: boolean;
}

export const fetchUpsertMonitorAction = createAction<UpsertMonitorRequest>('fetchUpsertMonitor');
export const fetchUpsertSuccessAction = createAction<{
  id: string;
  attributes: { enabled: boolean };
}>('fetchUpsertMonitorSuccess');
export const fetchUpsertFailureAction = createAction<{
  id: string;
  error: IHttpSerializedFetchError;
}>('fetchUpsertMonitorFailure');
export const clearMonitorUpsertStatus = createAction<string>('clearMonitorUpsertStatus');
