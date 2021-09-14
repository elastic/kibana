/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { QueryParams } from './types';
import { Ping } from '../../../common/runtime_types';

export const getMonitorStatusAction = createAction<QueryParams>('GET_MONITOR_STATUS');
export const getMonitorStatusActionSuccess = createAction<Ping>('GET_MONITOR_STATUS_SUCCESS');
export const getMonitorStatusActionFail = createAction<Error>('GET_MONITOR_STATUS_FAIL');
