/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import {
  GetPingHistogramParams,
  HistogramResult,
  PingsResponse,
  GetPingsParams,
} from '../../../common/runtime_types';

export const clearPings = createAction('CLEAR PINGS');

export const getPingHistogram = createAction<GetPingHistogramParams>('GET_PING_HISTOGRAM');
export const getPingHistogramSuccess = createAction<HistogramResult>('GET_PING_HISTOGRAM_SUCCESS');
export const getPingHistogramFail = createAction<Error>('GET_PING_HISTOGRAM_FAIL');

export const getPings = createAction<GetPingsParams>('GET PINGS');
export const getPingsSuccess = createAction<PingsResponse>('GET PINGS SUCCESS');
export const getPingsFail = createAction<Error>('GET PINGS FAIL');
