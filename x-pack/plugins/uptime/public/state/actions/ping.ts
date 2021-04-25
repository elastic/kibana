/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import {
  GetPingHistogramParams,
  HistogramResult,
  PingsResponse,
  GetPingsParams,
} from '../../../common/runtime_types';
import { createAsyncAction } from './utils';

export const clearPings = createAction('CLEAR PINGS');

export const getPingHistogram = createAsyncAction<GetPingHistogramParams, HistogramResult>(
  'GET_PING_HISTOGRAM'
);

export const getPings = createAction<GetPingsParams>('GET PINGS');
export const getPingsSuccess = createAction<PingsResponse>('GET PINGS SUCCESS');
export const getPingsFail = createAction<Error>('GET PINGS FAIL');
