/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IExecutionLog {
  id: string;
  timestamp: string;
  duration_ms: number;
  status: string;
  message: string;
  version: string;
  schedule_delay_ms: number;
  rule_id: string;
  space_ids: string[];
  connector_name: string;
}

export interface IExecutionLogResult {
  total: number;
  data: IExecutionLog[];
}
