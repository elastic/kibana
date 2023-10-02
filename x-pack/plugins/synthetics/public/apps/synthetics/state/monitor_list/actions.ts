/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { UpsertMonitorError, UpsertMonitorRequest } from '..';
import {
  MonitorManagementListResult,
  MonitorFiltersResult,
  EncryptedSyntheticsSavedMonitor,
} from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

import { MonitorListPageState } from './models';

export const fetchMonitorListAction = createAsyncAction<
  MonitorListPageState,
  MonitorManagementListResult
>('fetchMonitorListAction');
export const quietFetchMonitorListAction = createAction<MonitorListPageState>(
  'quietFetchMonitorListAction'
);

export const fetchUpsertMonitorAction = createAction<UpsertMonitorRequest>('fetchUpsertMonitor');
export const fetchUpsertSuccessAction = createAction<EncryptedSyntheticsSavedMonitor>(
  'fetchUpsertMonitorSuccess'
);
export const fetchUpsertFailureAction = createAction<UpsertMonitorError>(
  'fetchUpsertMonitorFailure'
);

export const enableMonitorAlertAction = createAsyncAction<
  UpsertMonitorRequest,
  EncryptedSyntheticsSavedMonitor,
  UpsertMonitorError
>('enableMonitorAlertAction');

export const clearMonitorUpsertStatus = createAction<string>('clearMonitorUpsertStatus');

export const updateManagementPageStateAction = createAction<Partial<MonitorListPageState>>(
  'updateManagementPageState'
);

export const cleanMonitorListState = createAction('cleanMonitorListState');

export const fetchMonitorFiltersAction = createAsyncAction<void, MonitorFiltersResult>(
  'fetchMonitorFiltersAction'
);
