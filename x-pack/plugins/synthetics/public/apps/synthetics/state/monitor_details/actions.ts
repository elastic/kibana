/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import {
  Ping,
  PingsResponse,
  EncryptedSyntheticsSavedMonitor,
} from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

export const setMonitorDetailsLocationAction = createAction<string>(
  '[MONITOR SUMMARY] SET LOCATION'
);

export const getMonitorAction = createAsyncAction<
  { monitorId: string },
  EncryptedSyntheticsSavedMonitor
>('[MONITOR DETAILS] GET MONITOR');

export const getMonitorLastRunAction = createAsyncAction<
  { monitorId: string; locationId: string },
  PingsResponse
>('[MONITOR DETAILS] GET LAST RUN');

export const updateMonitorLastRunAction = createAction<{ data: Ping }>(
  '[MONITOR DETAILS] UPdATE LAST RUN'
);

export const getMonitorRecentPingsAction = createAsyncAction<
  {
    monitorId: string;
    locationId: string;
    size?: number;
    pageIndex?: number;
    from?: string;
    to?: string;
  },
  PingsResponse
>('[MONITOR DETAILS] GET RECENT PINGS');
