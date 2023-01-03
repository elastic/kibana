/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export interface IExecutionLog {
  id: string;
  timestamp: string;
  duration_ms: number;
  status: string;
  message: string;
  version: string;
  schedule_delay_ms: number;
  connector_id: string;
  space_ids: string[];
  connector_name: string;
}

export interface IExecutionLogResult {
  total: number;
  data: IExecutionLog[];
}

export interface GetGlobalExecutionLogParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
  // namespaces?: Array<string | undefined>;
}

export interface GetGlobalExecutionKPIParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  namespaces?: Array<string | undefined>;
}

export const EMPTY_EXECUTION_KPI_RESULT = {
  success: 0,
  unknown: 0,
  failure: 0,
  warning: 0,
  activeAlerts: 0,
  newAlerts: 0,
  recoveredAlerts: 0,
  erroredActions: 0,
  triggeredActions: 0,
};
