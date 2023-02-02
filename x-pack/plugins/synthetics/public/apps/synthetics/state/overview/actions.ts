/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAction } from '@reduxjs/toolkit';
import { createAsyncAction } from '../utils/actions';

import { MonitorOverviewFlyoutConfig, MonitorOverviewPageState } from './models';
import { MonitorOverviewResult, OverviewStatus } from '../../../../../common/runtime_types';

export const fetchMonitorOverviewAction = createAsyncAction<
  MonitorOverviewPageState,
  MonitorOverviewResult
>('fetchMonitorOverviewAction');

export const setOverviewPageStateAction = createAction<Partial<MonitorOverviewPageState>>(
  'setOverviewPageStateAction'
);

export const setFlyoutConfig = createAction<MonitorOverviewFlyoutConfig>('setFlyoutConfig');
export const toggleErrorPopoverOpen = createAction<string | null>('setErrorPopoverOpen');

export const quietFetchOverviewAction = createAsyncAction<
  MonitorOverviewPageState,
  MonitorOverviewResult
>('quietFetchOverviewAction');

export const fetchOverviewStatusAction = createAsyncAction<
  MonitorOverviewPageState,
  OverviewStatus
>('fetchOverviewStatusAction');

export const quietFetchOverviewStatusAction = createAsyncAction<
  MonitorOverviewPageState,
  OverviewStatus
>('quietFetchOverviewStatusAction');

export const clearOverviewStatusErrorAction = createAction<void>('clearOverviewStatusErrorAction');
