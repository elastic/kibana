/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { IHttpFetchError } from '@kbn/core/public';
import { QueryParams } from './types';
import { MonitorDurationResult } from '../../../common/types';

type MonitorQueryParams = QueryParams & { monitorId: string };

export const getMonitorDurationAction = createAction<MonitorQueryParams>('GET_MONITOR_DURATION');
export const getMonitorDurationActionSuccess = createAction<MonitorDurationResult>(
  'GET_MONITOR_DURATION_SUCCESS'
);
export const getMonitorDurationActionFail = createAction<IHttpFetchError>(
  'GET_MONITOR_DURATION_FAIL'
);
