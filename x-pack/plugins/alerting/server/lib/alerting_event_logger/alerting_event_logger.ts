/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IEvent,
  IEventLogger,
  millisToNanos,
  SAVED_OBJECT_REL_PRIMARY,
} from '@kbn/event-log-plugin/server';
import { EVENT_LOG_ACTIONS } from '../../plugin';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { TaskRunnerTimings } from '../../task_runner/task_runner_timer';
import { AlertInstanceMeta, RuleExecutionStatus } from '../../types';
import { createAlertEventLogRecordObject } from '../create_alert_event_log_record_object';
import { RuleRunMetrics } from '../rule_run_metrics_store';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;

export interface RuleContextOpts {
  ruleId: string;
  ruleType: UntypedNormalizedRuleType;
  consumer: string;
  namespace?: string;
  spaceId: string;
  executionId: string;
  taskScheduledAt: Date;
  ruleName?: string;
}

type RuleContext = RuleContextOpts & {
  taskScheduleDelay: number;
};

interface DoneOpts {
  timings?: TaskRunnerTimings;
  status?: RuleExecutionStatus;
  metrics?: RuleRunMetrics | null;
}

interface AlertOpts {
  action: string;
  id: string;
  message: string;
  group?: string;
  meta?: AlertInstanceMeta;
  flapping: boolean;
}

interface ActionOpts {
  id: string;
  typeId: string;
  alertId: string;
  alertGroup?: string;
}

export class AlertingEventLogger {
  private eventLogger: IEventLogger;
  private isInitialized = false;
  private startTime?: Date;
  private ruleContext?: RuleContextOpts;

  // this is the "execute" event that will be updated over the lifecycle of this class
  private event: IEvent;

  constructor(eventLogger: IEventLogger) {
    this.eventLogger = eventLogger;
  }

  // For testing purposes
  public getEvent(): IEvent {
    return this.event;
  }

  public initialize(context: RuleContextOpts) {
    if (this.isInitialized) {
      throw new Error('AlertingEventLogger already initialized');
    }
    this.isInitialized = true;
    this.ruleContext = context;
  }

  public start() {
    if (!this.isInitialized || !this.ruleContext) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.startTime = new Date();

    const context = {
      ...this.ruleContext,
      taskScheduleDelay: this.startTime.getTime() - this.ruleContext.taskScheduledAt.getTime(),
    };

    // Initialize the "execute" event
    this.event = initializeExecuteRecord(context);
    this.eventLogger.startTiming(this.event, this.startTime);

    // Create and log "execute-start" event
    const executeStartEvent = createExecuteStartRecord(context, this.startTime);
    this.eventLogger.logEvent(executeStartEvent);
  }

  public getStartAndDuration(): { start?: Date; duration?: string | number } {
    return {
      start: this.startTime,
      duration: this.startTime
        ? millisToNanos(new Date().getTime() - this.startTime!.getTime())
        : '0',
    };
  }

  public setRuleName(ruleName: string) {
    if (!this.isInitialized || !this.event || !this.ruleContext) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.ruleContext.ruleName = ruleName;
    updateEvent(this.event, { ruleName });
  }

  public setExecutionSucceeded(message: string) {
    if (!this.isInitialized || !this.event) {
      throw new Error('AlertingEventLogger not initialized');
    }

    updateEvent(this.event, { message, outcome: 'success', alertingOutcome: 'success' });
  }

  public setExecutionFailed(message: string, errorMessage: string) {
    if (!this.isInitialized || !this.event) {
      throw new Error('AlertingEventLogger not initialized');
    }

    updateEvent(this.event, {
      message,
      outcome: 'failure',
      alertingOutcome: 'failure',
      error: errorMessage,
    });
  }

  public logTimeout() {
    if (!this.isInitialized || !this.ruleContext) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.eventLogger.logEvent(createExecuteTimeoutRecord(this.ruleContext));
  }

  public logAlert(alert: AlertOpts) {
    if (!this.isInitialized || !this.ruleContext) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.eventLogger.logEvent(createAlertRecord(this.ruleContext, alert));
  }

  public logAction(action: ActionOpts) {
    if (!this.isInitialized || !this.ruleContext) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.eventLogger.logEvent(createActionExecuteRecord(this.ruleContext, action));
  }

  public done({ status, metrics, timings }: DoneOpts) {
    if (!this.isInitialized || !this.event || !this.ruleContext) {
      throw new Error('AlertingEventLogger not initialized');
    }

    this.eventLogger.stopTiming(this.event);

    if (status) {
      updateEvent(this.event, { status: status.status });

      if (status.error) {
        updateEvent(this.event, {
          outcome: 'failure',
          alertingOutcome: 'failure',
          reason: status.error?.reason || 'unknown',
          error: this.event?.error?.message || status.error.message,
          ...(this.event.message
            ? {}
            : {
                message: `${this.ruleContext.ruleType.id}:${this.ruleContext.ruleId}: execution failed`,
              }),
        });
      } else {
        if (status.warning) {
          updateEvent(this.event, {
            alertingOutcome: 'warning',
            reason: status.warning?.reason || 'unknown',
            message: status.warning?.message || this.event?.message,
          });
        }
      }
    }

    if (metrics) {
      updateEvent(this.event, { metrics });
    }

    if (timings) {
      updateEvent(this.event, { timings });
    }

    this.eventLogger.logEvent(this.event);
  }
}

export function createExecuteStartRecord(context: RuleContext, startTime?: Date) {
  const event = initializeExecuteRecord(context);
  return {
    ...event,
    event: {
      ...event.event,
      action: EVENT_LOG_ACTIONS.executeStart,
      ...(startTime ? { start: startTime.toISOString() } : {}),
    },
    message: `rule execution start: "${context.ruleId}"`,
  };
}

export function createAlertRecord(context: RuleContextOpts, alert: AlertOpts) {
  return createAlertEventLogRecordObject({
    ruleId: context.ruleId,
    ruleType: context.ruleType,
    consumer: context.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: alert.action,
    meta: alert.meta,
    instanceId: alert.id,
    group: alert.group,
    message: alert.message,
    savedObjects: [
      {
        id: context.ruleId,
        type: 'alert',
        typeId: context.ruleType.id,
        relation: SAVED_OBJECT_REL_PRIMARY,
      },
    ],
    ruleName: context.ruleName,
    flapping: alert.flapping,
  });
}

export function createActionExecuteRecord(context: RuleContextOpts, action: ActionOpts) {
  return createAlertEventLogRecordObject({
    ruleId: context.ruleId,
    ruleType: context.ruleType,
    consumer: context.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.executeAction,
    instanceId: action.alertId,
    group: action.alertGroup,
    message: `alert: ${context.ruleType.id}:${context.ruleId}: '${context.ruleName}' instanceId: '${action.alertId}' scheduled actionGroup: '${action.alertGroup}' action: ${action.typeId}:${action.id}`,
    savedObjects: [
      {
        id: context.ruleId,
        type: 'alert',
        typeId: context.ruleType.id,
        relation: SAVED_OBJECT_REL_PRIMARY,
      },
      {
        type: 'action',
        id: action.id,
        typeId: action.typeId,
      },
    ],
    ruleName: context.ruleName,
  });
}

export function createExecuteTimeoutRecord(context: RuleContextOpts) {
  return createAlertEventLogRecordObject({
    ruleId: context.ruleId,
    ruleType: context.ruleType,
    consumer: context.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.executeTimeout,
    message: `rule: ${context.ruleType.id}:${context.ruleId}: '${
      context.ruleName ?? ''
    }' execution cancelled due to timeout - exceeded rule type timeout of ${
      context.ruleType.ruleTaskTimeout
    }`,
    savedObjects: [
      {
        id: context.ruleId,
        type: 'alert',
        typeId: context.ruleType.id,
        relation: SAVED_OBJECT_REL_PRIMARY,
      },
    ],
    ruleName: context.ruleName,
  });
}

export function initializeExecuteRecord(context: RuleContext) {
  return createAlertEventLogRecordObject({
    ruleId: context.ruleId,
    ruleType: context.ruleType,
    consumer: context.consumer,
    namespace: context.namespace,
    spaceId: context.spaceId,
    executionId: context.executionId,
    action: EVENT_LOG_ACTIONS.execute,
    task: {
      scheduled: context.taskScheduledAt.toISOString(),
      scheduleDelay: Millis2Nanos * context.taskScheduleDelay,
    },
    savedObjects: [
      {
        id: context.ruleId,
        type: 'alert',
        typeId: context.ruleType.id,
        relation: SAVED_OBJECT_REL_PRIMARY,
      },
    ],
  });
}

interface UpdateEventOpts {
  message?: string;
  outcome?: string;
  alertingOutcome?: string;
  error?: string;
  ruleName?: string;
  status?: string;
  reason?: string;
  metrics?: RuleRunMetrics;
  timings?: TaskRunnerTimings;
}

export function updateEvent(event: IEvent, opts: UpdateEventOpts) {
  const { message, outcome, error, ruleName, status, reason, metrics, timings, alertingOutcome } =
    opts;
  if (!event) {
    throw new Error('Cannot update event because it is not initialized.');
  }
  if (message) {
    event.message = message;
  }

  if (outcome) {
    event.event = event.event || {};
    event.event.outcome = outcome;
  }

  if (alertingOutcome) {
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.outcome = alertingOutcome;
  }

  if (error) {
    event.error = event.error || {};
    event.error.message = error;
  }

  if (ruleName) {
    event.rule = {
      ...event.rule,
      name: ruleName,
    };
  }

  if (status) {
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.status = status;
  }

  if (reason) {
    event.event = event.event || {};
    event.event.reason = reason;
  }

  if (metrics) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.execution = event.kibana.alert.rule.execution || {};
    event.kibana.alert.rule.execution.metrics = {
      ...event.kibana.alert.rule.execution.metrics,
      number_of_triggered_actions: metrics.numberOfTriggeredActions
        ? metrics.numberOfTriggeredActions
        : 0,
      number_of_generated_actions: metrics.numberOfGeneratedActions
        ? metrics.numberOfGeneratedActions
        : 0,
      alert_counts: {
        active: metrics.numberOfActiveAlerts ? metrics.numberOfActiveAlerts : 0,
        new: metrics.numberOfNewAlerts ? metrics.numberOfNewAlerts : 0,
        recovered: metrics.numberOfRecoveredAlerts ? metrics.numberOfRecoveredAlerts : 0,
      },
      number_of_searches: metrics.numSearches ? metrics.numSearches : 0,
      es_search_duration_ms: metrics.esSearchDurationMs ? metrics.esSearchDurationMs : 0,
      total_search_duration_ms: metrics.totalSearchDurationMs ? metrics.totalSearchDurationMs : 0,
    };
  }

  if (timings) {
    event.kibana = event.kibana || {};
    event.kibana.alert = event.kibana.alert || {};
    event.kibana.alert.rule = event.kibana.alert.rule || {};
    event.kibana.alert.rule.execution = event.kibana.alert.rule.execution || {};
    event.kibana.alert.rule.execution.metrics = {
      ...event.kibana.alert.rule.execution.metrics,
      ...timings,
    };
  }
}
