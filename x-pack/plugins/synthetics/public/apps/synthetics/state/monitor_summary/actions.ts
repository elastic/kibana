/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { Ping, SyntheticsMonitor } from '../../../../../common/runtime_types';
import { QueryParams } from './api';
import { createAsyncAction } from '../utils/actions';

export const setMonitorSummaryLocationAction = createAction<string>(
  '[MONITOR SUMMARY] SET LOCATION'
);

export const getMonitorStatusAction = createAsyncAction<QueryParams, Ping>('[MONITOR SUMMARY] GET');

export const getSyntheticsMonitorAction = createAsyncAction<string, SyntheticsMonitor>(
  'fetchSyntheticsMonitorAction'
);
