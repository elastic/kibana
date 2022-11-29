/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash';
import { IExecutionLog, IExecutionLogResult } from '../types';

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
    id: result.kibana.alert.rule.execution.uuid,
    timestamp: get(result, '@timestamp.min'),
    duration_ms: result.alerting.doc.event.duration / Millis2Nanos,
    status,
    message,
    version: result.alerting.doc.kibana.version,
    num_active_alerts: result.alerting.doc.kibana.alert.rule.execution.metrics.alert_counts.active,
    num_new_alerts: result.alerting.doc.kibana.alert.rule.execution.metrics.alert_counts.new,
    num_recovered_alerts:
      result.alerting.doc.kibana.alert.rule.execution.metrics.alert_counts.recovered,
    num_triggered_actions:
      result.alerting.doc.kibana.alert.rule.execution.metrics.number_of_triggered_actions,
    num_generated_actions:
      result.alerting.doc.kibana.alert.rule.execution.metrics.number_of_generated_actions,
    num_succeeded_actions: result.actions.outcomes.success ?? 0,
    num_errored_actions: result.actions.outcomes.failure ?? 0,
    total_search_duration_ms:
      result.alerting.doc.kibana.alert.rule.execution.metrics.total_search_duration_ms,
    es_search_duration_ms:
      result.alerting.doc.kibana.alert.rule.execution.metrics.es_search_duration_ms,
    schedule_delay_ms: result.alerting.doc.kibana.task.schedule_delay / Millis2Nanos,
    timed_out: result.alerting.timeout > 0,
    rule_id: result.alerting.doc.rule.id,
    space_ids: result.alerting.doc.kibana.space_ids,
    rule_name: result.alerting.doc.rule.name,
  };
};
