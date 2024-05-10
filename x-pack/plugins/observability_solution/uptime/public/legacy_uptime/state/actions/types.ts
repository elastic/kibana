/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { UptimeAlertTypeParams } from '../alerts/alerts';

export interface AsyncAction<Payload, SuccessPayload, ErrorPayload = IHttpFetchError> {
  get: (payload: Payload) => Action<Payload>;
  success: (payload: SuccessPayload) => Action<SuccessPayload>;
  fail: (payload: ErrorPayload) => Action<ErrorPayload>;
}
export interface AsyncActionOptionalPayload<Payload, SuccessPayload, ErrorPayload>
  extends AsyncAction<Payload, SuccessPayload, ErrorPayload> {
  get: (payload?: Payload) => Action<Payload>;
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
  refresh?: boolean;
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
  awaitingNodeAssignment: boolean;
}

export interface DeleteJobResults {
  [id: string]: {
    [status: string]: boolean;
    error?: any;
  };
}

export interface AlertsResult {
  page: number;
  perPage: number;
  total: number;
  data: Array<Rule<UptimeAlertTypeParams>>;
}
