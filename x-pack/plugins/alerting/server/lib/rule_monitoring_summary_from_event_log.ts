/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean, sum, xor } from 'lodash';
import {
  SanitizedAlert as SanitizedRule,
  RuleMonitoringSummary,
  RuleExecutionSummary,
  ActionExecutionSummary,
} from '../types';
import { IEvent } from '../../../event_log/server';
import { EVENT_LOG_ACTIONS, LEGACY_EVENT_LOG_ACTIONS } from '../plugin';

export interface RuleMonitoringSummaryFromEventLogParams {
  rule: SanitizedRule<{ bar: boolean }>;
  events: IEvent[];
  dateStart: string;
  dateEnd: string;
}

export function ruleMonitoringSummaryFromEventLog(
  params: RuleMonitoringSummaryFromEventLogParams
): RuleMonitoringSummary {
  // initialize the  result
  const { rule, events, dateStart, dateEnd } = params;
  const summary: RuleMonitoringSummary = {
    id: rule.id,
    name: rule.name,
    tags: rule.tags,
    rule_type_id: rule.alertTypeId,
    consumer: rule.consumer,
    start_date: dateStart,
    end_date: dateEnd,
    mute_all: rule.muteAll,
    throttle: rule.throttle,
    enabled: rule.enabled,
    executions: [],
    actions: [],
    avg_delay: 0,
    avg_duration: 0,
    avg_action_delay: 0,
    avg_action_duration: 0,
    num_successful_executions: 0,
    num_failed_executions: 0,
    num_successful_actions: 0,
    num_failed_actions: 0,
    num_alerts: 0,
  };

  // loop through the events
  // should be sorted newest to oldest, we want oldest to newest, so reverse
  for (const event of events.reverse()) {
    const timeStamp = event?.['@timestamp'];
    if (timeStamp === undefined) continue;

    const provider = event?.event?.provider;
    if (provider !== 'alerting' && provider !== 'actions') continue;

    const action = event?.event?.action;
    if (action === undefined) continue;

    if (provider === 'alerting') {
      if (action === EVENT_LOG_ACTIONS.execute) {
        const executionSummary: RuleExecutionSummary = {
          start: event?.event?.start,
          end: event?.event?.end,
          delay: event?.kibana?.task?.schedule_delay,
          outcome: event?.event?.outcome,
          duration: event?.event?.duration,
          status: event?.kibana?.alerting?.status, // whether any alerts were found
          num_recovered_alerts: 0,
          recovered_alert_ids: [],
          num_new_alerts: 0,
          new_alert_ids: [],
          num_active_alerts: 0,
          active_alert_ids: [],
        };

        const errorMessage = event?.error?.message;
        if (errorMessage !== undefined) {
          executionSummary.error_message = errorMessage;
        }

        summary.executions.push(executionSummary);

        continue;
      }

      if (summary.executions.length > 0) {
        const currentExecutionSummary = summary.executions[summary.executions.length - 1];
        const instanceId = event?.kibana?.alerting?.instance_id;
        if (instanceId === undefined) continue;

        switch (action) {
          case EVENT_LOG_ACTIONS.newInstance:
            currentExecutionSummary.num_new_alerts++;
            currentExecutionSummary.new_alert_ids.push(instanceId);
            break;
          case EVENT_LOG_ACTIONS.activeInstance:
            currentExecutionSummary.num_active_alerts++;
            currentExecutionSummary.active_alert_ids.push(instanceId);
            break;
          case LEGACY_EVENT_LOG_ACTIONS.resolvedInstance:
          case EVENT_LOG_ACTIONS.recoveredInstance:
            currentExecutionSummary.num_recovered_alerts++;
            currentExecutionSummary.recovered_alert_ids.push(instanceId);
            break;
        }
      }
    } else if (provider === 'actions') {
      if (action === EVENT_LOG_ACTIONS.execute) {
        const executionSummary: ActionExecutionSummary = {
          start: event?.event?.start,
          end: event?.event?.end,
          delay: event?.kibana?.task?.schedule_delay,
          outcome: event?.event?.outcome,
          duration: event?.event?.duration,
        };

        const errorMessage = event?.error?.message;
        if (errorMessage !== undefined) {
          executionSummary.error_message = errorMessage;
        }

        summary.actions.push(executionSummary);

        continue;
      }
    }
  }

  for (const execution of summary.executions) {
    execution.num_active_alerts -= execution.num_new_alerts;
    execution.active_alert_ids = xor(execution.active_alert_ids, execution.new_alert_ids);
  }

  summary.num_alerts = sum(
    summary.executions.flatMap((execution) => [
      execution.num_new_alerts,
      execution.num_active_alerts,
    ])
  );

  const summarizedExecutions = getSummarizedStats(summary.executions);
  summary.avg_duration = summarizedExecutions.avgDuration;
  summary.avg_delay = summarizedExecutions.avgDelay;
  summary.num_successful_executions = summarizedExecutions.numSuccess;
  summary.num_failed_executions = summarizedExecutions.numFailed;

  const summarizedActions = getSummarizedStats(summary.actions);
  summary.avg_action_duration = summarizedActions.avgDuration;
  summary.avg_action_delay = summarizedActions.avgDelay;
  summary.num_successful_actions = summarizedActions.numSuccess;
  summary.num_failed_actions = summarizedActions.numFailed;

  // reverse the executions so the newest is first
  summary.executions = summary.executions.reverse();
  summary.actions = summary.actions.reverse();

  return summary;
}

function getSummarizedStats(executions: RuleExecutionSummary[] | ActionExecutionSummary[]) {
  const avgDuration = mean(
    executions.map((execution) => execution.duration).filter((duration) => null != duration)
  );
  const avgDelay = mean(
    executions.map((execution) => execution.delay).filter((delay) => null != delay)
  );
  const numSuccess = executions.filter((execution) => execution.outcome === 'success').length;
  const numFailed = executions.filter((execution) => execution.outcome === 'failure').length;

  return {
    avgDuration,
    avgDelay,
    numSuccess,
    numFailed,
  };
}
