/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorToastOptions } from '@kbn/core-notifications-browser';

import type { MonitorListSortField } from '../../../../../common/runtime_types/monitor_management/sort_field';
import {
  EncryptedSyntheticsMonitor,
  FetchMonitorManagementListQueryArgs,
  SyntheticsMonitor,
} from '../../../../../common/runtime_types';

import { IHttpSerializedFetchError } from '../utils/http_error';

export interface MonitorFilterState {
  query?: string;
  tags?: string[];
  monitorTypes?: string[];
  projects?: string[];
  schedules?: string[];
  locations?: string[];
  monitorQueryIds?: string[]; // Monitor Query IDs
}

export interface MonitorListPageState extends MonitorFilterState {
  pageIndex: number;
  pageSize: number;
  sortField: MonitorListSortField;
  sortOrder: NonNullable<FetchMonitorManagementListQueryArgs['sortOrder']>;
}

interface ToastParams<MessageType> {
  message: MessageType;
  lifetimeMs: number;
  testAttribute?: string;
}

export interface UpsertMonitorRequest {
  configId: string;
  monitor: Partial<SyntheticsMonitor> | Partial<EncryptedSyntheticsMonitor>;
  success: ToastParams<string>;
  error: ToastParams<ErrorToastOptions>;
  /**
   * The effect will perform a quiet refresh of the overview state
   * after a successful upsert. The default behavior is to perform the fetch.
   */
  shouldQuietFetchAfterSuccess?: boolean;
}

export interface UpsertMonitorError {
  configId: string;
  error: IHttpSerializedFetchError;
}
