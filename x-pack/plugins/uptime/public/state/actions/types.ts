/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { IHttpFetchError } from 'src/core/public';

export interface AsyncAction<Payload, SuccessPayload> {
  get: (payload: Payload) => Action<Payload>;
  success: (payload: SuccessPayload) => Action<SuccessPayload>;
  fail: (payload: IHttpFetchError) => Action<IHttpFetchError>;
}
export interface AsyncAction1<Payload, SuccessPayload> {
  get: (payload?: Payload) => Action<Payload>;
  success: (payload: SuccessPayload) => Action<SuccessPayload>;
  fail: (payload: IHttpFetchError) => Action<IHttpFetchError>;
}

export interface MonitorIdParam {
  monitorId: string;
}

export interface HeartbeatIndicesParam {
  heartbeatIndices: string;
}

export interface QueryParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
  filters?: string;
  statusFilter?: string;
  location?: string;
}

export interface MonitorDetailsActionPayload {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
  location?: string;
}

export interface CreateMLJobSuccess {
  count: number;
  jobId: string;
}

export interface DeleteJobResults {
  [id: string]: {
    [status: string]: boolean;
    error?: any;
  };
}
