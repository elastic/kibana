/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAction } from '@reduxjs/toolkit';
import { MonitorOverviewPageState } from '..';
import { createAsyncAction } from '../utils/actions';

import { OverviewStatus } from '../../../../../common/runtime_types';

export const fetchOverviewStatusAction = createAsyncAction<
  { pageState: MonitorOverviewPageState; scopeStatusByLocation?: boolean },
  OverviewStatus
>('fetchOverviewStatusAction');

export const quietFetchOverviewStatusAction = createAsyncAction<
  { pageState: MonitorOverviewPageState; scopeStatusByLocation?: boolean },
  OverviewStatus
>('quietFetchOverviewStatusAction');

export const clearOverviewStatusErrorAction = createAction<void>('clearOverviewStatusErrorAction');
