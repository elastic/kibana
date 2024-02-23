/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnector } from './api';
import { DynamicSettings } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

export const getDynamicSettingsAction = createAsyncAction<void, DynamicSettings>(
  'GET_DYNAMIC_SETTINGS'
);
export const setDynamicSettingsAction = createAsyncAction<DynamicSettings, DynamicSettings>(
  'SET_DYNAMIC_SETTINGS'
);
export const getConnectorsAction = createAsyncAction<void, ActionConnector[]>('GET CONNECTORS');

export const syncGlobalParamsAction = createAsyncAction<void, boolean>('SYNC GLOBAL PARAMS');

export const getLocationMonitorsAction = createAsyncAction<void, any>('GET LOCATION MONITORS');
