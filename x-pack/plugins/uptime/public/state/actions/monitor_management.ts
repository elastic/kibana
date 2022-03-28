/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import {
  MonitorManagementListResult,
  ServiceLocations,
  ThrottlingOptions,
  FetchMonitorManagementListQueryArgs,
} from '../../../common/runtime_types';
import { createAsyncAction } from './utils';
import { SyntheticsServiceAllowed } from '../../../common/types';

export const getMonitors = createAction<FetchMonitorManagementListQueryArgs>(
  'GET_MONITOR_MANAGEMENT_LIST'
);
export const getMonitorsSuccess = createAction<MonitorManagementListResult>(
  'GET_MONITOR_MANAGEMENT_LIST_SUCCESS'
);
export const getMonitorsFailure = createAction<Error>('GET_MONITOR_MANAGEMENT_LIST_FAILURE');

export const getServiceLocations = createAction('GET_SERVICE_LOCATIONS_LIST');
export const getServiceLocationsSuccess = createAction<{
  throttling: ThrottlingOptions | undefined;
  locations: ServiceLocations;
}>('GET_SERVICE_LOCATIONS_LIST_SUCCESS');
export const getServiceLocationsFailure = createAction<Error>('GET_SERVICE_LOCATIONS_LIST_FAILURE');

export const getSyntheticsServiceAllowed = createAsyncAction<void, SyntheticsServiceAllowed>(
  'GET_SYNTHETICS_SERVICE_ALLOWED'
);
