/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rRuleResponseSchemaV1 } from '../../../r_rule';
import { alertsFilterQuerySchemaV1 } from '../../../alerts_filter_query';
import {
  ruleNotifyWhen as ruleNotifyWhenV1,
  ruleExecutionStatusValues as ruleExecutionStatusValuesV1,
  ruleExecutionStatusErrorReason as ruleExecutionStatusErrorReasonV1,
  ruleExecutionStatusWarningReason as ruleExecutionStatusWarningReasonV1,
  ruleLastRunOutcomeValues as ruleLastRunOutcomeValuesV1,
} from '../../common/constants/v1';
import { validateNotifyWhenV1 } from '../../validation';

export const ruleParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));
export const actionParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));
export const mappedParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));

export const notifyWhenSchema = schema.oneOf(
  [
    schema.literal(ruleNotifyWhenV1.CHANGE),
    schema.literal(ruleNotifyWhenV1.ACTIVE),
    schema.literal(ruleNotifyWhenV1.THROTTLE),
  ],
  { validate: validateNotifyWhenV1 }
);

const intervalScheduleSchema = schema.object({
  interval: schema.string(),
});

const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notify_when: notifyWhenSchema,
  throttle: schema.nullable(schema.string()),
});

const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(alertsFilterQuerySchemaV1),
  timeframe: schema.maybe(
    schema.object({
      days: schema.arrayOf(
        schema.oneOf([
          schema.literal(1),
          schema.literal(2),
          schema.literal(3),
          schema.literal(4),
          schema.literal(5),
          schema.literal(6),
          schema.literal(7),
        ])
      ),
      hours: schema.object({
        start: schema.string(),
        end: schema.string(),
      }),
      timezone: schema.string(),
    })
  ),
});

const actionSchema = schema.object({
  uuid: schema.maybe(schema.string()),
  group: schema.maybe(schema.string()),
  id: schema.string(),
  connector_type_id: schema.string(),
  params: actionParamsSchema,
  frequency: schema.maybe(actionFrequencySchema),
  alerts_filter: schema.maybe(actionAlertsFilterSchema),
  use_alert_data_for_template: schema.maybe(schema.boolean()),
});

export const ruleExecutionStatusSchema = schema.object({
  status: schema.oneOf([
    schema.literal(ruleExecutionStatusValuesV1.OK),
    schema.literal(ruleExecutionStatusValuesV1.ACTIVE),
    schema.literal(ruleExecutionStatusValuesV1.ERROR),
    schema.literal(ruleExecutionStatusValuesV1.WARNING),
    schema.literal(ruleExecutionStatusValuesV1.PENDING),
    schema.literal(ruleExecutionStatusValuesV1.UNKNOWN),
  ]),
  last_execution_date: schema.string(),
  last_duration: schema.maybe(schema.number()),
  error: schema.maybe(
    schema.object({
      reason: schema.oneOf([
        schema.literal(ruleExecutionStatusErrorReasonV1.READ),
        schema.literal(ruleExecutionStatusErrorReasonV1.DECRYPT),
        schema.literal(ruleExecutionStatusErrorReasonV1.EXECUTE),
        schema.literal(ruleExecutionStatusErrorReasonV1.UNKNOWN),
        schema.literal(ruleExecutionStatusErrorReasonV1.LICENSE),
        schema.literal(ruleExecutionStatusErrorReasonV1.TIMEOUT),
        schema.literal(ruleExecutionStatusErrorReasonV1.DISABLED),
        schema.literal(ruleExecutionStatusErrorReasonV1.VALIDATE),
      ]),
      message: schema.string(),
    })
  ),
  warning: schema.maybe(
    schema.object({
      reason: schema.oneOf([
        schema.literal(ruleExecutionStatusWarningReasonV1.MAX_EXECUTABLE_ACTIONS),
        schema.literal(ruleExecutionStatusWarningReasonV1.MAX_ALERTS),
        schema.literal(ruleExecutionStatusWarningReasonV1.MAX_QUEUED_ACTIONS),
      ]),
      message: schema.string(),
    })
  ),
});

export const ruleLastRunSchema = schema.object({
  outcome: schema.oneOf([
    schema.literal(ruleLastRunOutcomeValuesV1.SUCCEEDED),
    schema.literal(ruleLastRunOutcomeValuesV1.WARNING),
    schema.literal(ruleLastRunOutcomeValuesV1.FAILED),
  ]),
  outcome_order: schema.maybe(schema.number()),
  warning: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal(ruleExecutionStatusErrorReasonV1.READ),
        schema.literal(ruleExecutionStatusErrorReasonV1.DECRYPT),
        schema.literal(ruleExecutionStatusErrorReasonV1.EXECUTE),
        schema.literal(ruleExecutionStatusErrorReasonV1.UNKNOWN),
        schema.literal(ruleExecutionStatusErrorReasonV1.LICENSE),
        schema.literal(ruleExecutionStatusErrorReasonV1.TIMEOUT),
        schema.literal(ruleExecutionStatusErrorReasonV1.DISABLED),
        schema.literal(ruleExecutionStatusErrorReasonV1.VALIDATE),
        schema.literal(ruleExecutionStatusWarningReasonV1.MAX_EXECUTABLE_ACTIONS),
        schema.literal(ruleExecutionStatusWarningReasonV1.MAX_ALERTS),
        schema.literal(ruleExecutionStatusWarningReasonV1.MAX_QUEUED_ACTIONS),
      ])
    )
  ),
  outcome_msg: schema.maybe(schema.nullable(schema.arrayOf(schema.string()))),
  alerts_count: schema.object({
    active: schema.maybe(schema.nullable(schema.number())),
    new: schema.maybe(schema.nullable(schema.number())),
    recovered: schema.maybe(schema.nullable(schema.number())),
    ignored: schema.maybe(schema.nullable(schema.number())),
  }),
});

export const monitoringSchema = schema.object({
  run: schema.object({
    history: schema.arrayOf(
      schema.object({
        success: schema.boolean(),
        timestamp: schema.number(),
        duration: schema.maybe(schema.number()),
        outcome: schema.maybe(ruleLastRunSchema),
      })
    ),
    calculated_metrics: schema.object({
      p50: schema.maybe(schema.number()),
      p95: schema.maybe(schema.number()),
      p99: schema.maybe(schema.number()),
      success_ratio: schema.number(),
    }),
    last_run: schema.object({
      timestamp: schema.string(),
      metrics: schema.object({
        duration: schema.maybe(schema.number()),
        total_search_duration_ms: schema.maybe(schema.nullable(schema.number())),
        total_indexing_duration_ms: schema.maybe(schema.nullable(schema.number())),
        total_alerts_detected: schema.maybe(schema.nullable(schema.number())),
        total_alerts_created: schema.maybe(schema.nullable(schema.number())),
        gap_duration_s: schema.maybe(schema.nullable(schema.number())),
      }),
    }),
  }),
});

export const ruleSnoozeScheduleSchema = schema.object({
  id: schema.maybe(schema.string()),
  duration: schema.number(),
  rRule: rRuleResponseSchemaV1,
  skipRecurrences: schema.maybe(schema.arrayOf(schema.string())),
});

export const alertDelaySchema = schema.object({
  active: schema.number(),
});

export const ruleResponseSchema = schema.object({
  id: schema.string(),
  enabled: schema.boolean(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  rule_type_id: schema.string(),
  consumer: schema.string(),
  schedule: intervalScheduleSchema,
  actions: schema.arrayOf(actionSchema),
  params: ruleParamsSchema,
  mapped_params: schema.maybe(mappedParamsSchema),
  scheduled_task_id: schema.maybe(schema.string()),
  created_by: schema.nullable(schema.string()),
  updated_by: schema.nullable(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
  api_key_owner: schema.nullable(schema.string()),
  api_key_created_by_user: schema.maybe(schema.nullable(schema.boolean())),
  throttle: schema.maybe(schema.nullable(schema.string())),
  mute_all: schema.boolean(),
  notify_when: schema.maybe(schema.nullable(notifyWhenSchema)),
  muted_alert_ids: schema.arrayOf(schema.string()),
  execution_status: ruleExecutionStatusSchema,
  monitoring: schema.maybe(monitoringSchema),
  snooze_schedule: schema.maybe(schema.arrayOf(ruleSnoozeScheduleSchema)),
  active_snoozes: schema.maybe(schema.arrayOf(schema.string())),
  is_snoozed_until: schema.maybe(schema.nullable(schema.string())),
  last_run: schema.maybe(schema.nullable(ruleLastRunSchema)),
  next_run: schema.maybe(schema.nullable(schema.string())),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
  view_in_app_relative_url: schema.maybe(schema.nullable(schema.string())),
  alert_delay: schema.maybe(alertDelaySchema),
});

export const scheduleIdsSchema = schema.maybe(schema.arrayOf(schema.string()));
