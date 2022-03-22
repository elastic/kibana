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
  FetchMonitorManagementListQueryArgs,
} from '../../../common/runtime_types';

export const getMonitors = createAction<FetchMonitorManagementListQueryArgs>(
  'GET_MONITOR_MANAGEMENT_LIST'
);
export const getMonitorsSuccess = createAction<MonitorManagementListResult>(
  'GET_MONITOR_MANAGEMENT_LIST_SUCCESS'
);
export const getMonitorsFailure = createAction<Error>('GET_MONITOR_MANAGEMENT_LIST_FAILURE');

export const getServiceLocations = createAction('GET_SERVICE_LOCATIONS_LIST');
export const getServiceLocationsSuccess = createAction<ServiceLocations>(
  'GET_SERVICE_LOCATIONS_LIST_SUCCESS'
);
export const getServiceLocationsFailure = createAction<Error>('GET_SERVICE_LOCATIONS_LIST_FAILURE');

export const getSyntheticsEnablement = createAction('GET_SYNTHETICS_ENABLEMENT');
export const getSyntheticsEnablementSuccess = createAction<any>(
  'GET_SYNTHETICS_ENABLEMENT_SUCCESS'
);
export const getSyntheticsEnablementFailure = createAction<Error>(
  'GET_SYNTHETICS_ENABLEMENT_FAILURE'
);

export const disableSynthetics = createAction('DISABLE_SYNTHETICS');
export const disableSyntheticsSuccess = createAction<any>('DISABLE_SYNTEHTICS_SUCCESS');
export const disableSyntheticsFailure = createAction<Error>('DISABLE_SYNTHETICS_FAILURE');

export const enableSynthetics = createAction('ENABLE_SYNTHETICS');
export const enableSyntheticsSuccess = createAction<any>('ENABLE_SYNTEHTICS_SUCCESS');
export const enableSyntheticsFailure = createAction<Error>('ENABLE_SYNTHETICS_FAILURE');
