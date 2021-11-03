/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { MonitorDetailsActionPayload } from './types';
import { PingError } from '../../../common/runtime_types';
import { MonitorLocations } from '../../../common/runtime_types';
import { QueryParams } from './types';
import { createAsyncAction } from './utils';

export interface MonitorLocationsPayload extends QueryParams {
  monitorId: string;
}

export interface MonitorDetailsState {
  monitorId: string;
  error: PingError;
}

export const getMonitorDetailsAction = createAsyncAction<
  MonitorDetailsActionPayload,
  MonitorDetailsState
>('GET_MONITOR_DETAILS');

export const getMonitorLocationsAction =
  createAction<MonitorLocationsPayload>('GET_MONITOR_LOCATIONS');
export const getMonitorLocationsActionSuccess = createAction<MonitorLocations>(
  'GET_MONITOR_LOCATIONS_SUCCESS'
);
export const getMonitorLocationsActionFail = createAction<Error>('GET_MONITOR_LOCATIONS_FAIL');
