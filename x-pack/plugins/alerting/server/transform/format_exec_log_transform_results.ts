/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
import { IExecutionLog, IExecutionLogResult } from '../types';
import { ExecLogTransformFields } from './exec_log_transform_client';

const Millis2Nanos = 1000 * 1000;

export const formatExecLogTransformResults = (results: {
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}): IExecutionLogResult => {
  return {
    total: results.total,
    data: results.data.map((result: unknown) => formatTransformResult(result)),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatTransformResult = (result: any): IExecutionLog => {
  let status = result.alerting.doc.kibana.alerting.outcome;
  if (isEmpty(status)) {
    status = result.alerting.doc.event.outcome;
  }

  const message =
    status === 'failure'
      ? `${result.alerting.doc.message} - ${result.alerting.doc.error.message}`
      : result.alerting.doc.message;

  return {
    id: get(result, ExecLogTransformFields.id),
    timestamp: get(result, ExecLogTransformFields.timestamp),
    duration_ms: get(result, ExecLogTransformFields.execution_duration, 0) / Millis2Nanos,
    status,
    message,
    version: get(result, ExecLogTransformFields.version),
    num_active_alerts: get(result, ExecLogTransformFields.num_active_alerts, 0),
    num_new_alerts: get(result, ExecLogTransformFields.num_new_alerts, 0),
    num_recovered_alerts: get(result, ExecLogTransformFields.num_recovered_alerts, 0),
    num_triggered_actions: get(result, ExecLogTransformFields.num_triggered_actions, 0),
    num_generated_actions: get(result, ExecLogTransformFields.num_generated_actions, 0),
    num_succeeded_actions: get(result, ExecLogTransformFields.num_succeeded_actions, 0),
    num_errored_actions: get(result, ExecLogTransformFields.num_errored_actions, 0),
    total_search_duration_ms: get(result, ExecLogTransformFields.total_search_duration, 0),
    es_search_duration_ms: get(result, ExecLogTransformFields.es_search_duration, 0),
    schedule_delay_ms: get(result, ExecLogTransformFields.schedule_delay, 0) / Millis2Nanos,
    timed_out: get(result, ExecLogTransformFields.timed_out, 0) > 0,
    rule_id: get(result, ExecLogTransformFields.rule_id),
    space_ids: get(result, ExecLogTransformFields.space_ids),
    rule_name: get(result, ExecLogTransformFields.rule_name),
  };
};
