/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { QueryParams } from './types';
import { MonitorDurationResult } from '../../../common/types';
import { IHttpFetchError } from '../../../../../../target/types/core/public/http';

type MonitorQueryParams = QueryParams & { monitorId: string };

export const getMonitorDurationAction = createAction<MonitorQueryParams>('GET_MONITOR_DURATION');
export const getMonitorDurationActionSuccess = createAction<MonitorDurationResult>(
  'GET_MONITOR_DURATION_SUCCESS'
);
export const getMonitorDurationActionFail = createAction<IHttpFetchError>(
  'GET_MONITOR_DURATION_FAIL'
);
