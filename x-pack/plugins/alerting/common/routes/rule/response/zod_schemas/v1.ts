/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import {
  customThresholdZodParamsSchemaV1,
  metricThresholdZodParamsSchemaV1,
  esQueryZodParamsSchemaV1,
} from '@kbn/rule-data-utils';
import { rRuleResponseZodSchemaV1 } from '../../../r_rule';
import { alertsFilterQueryZodSchemaV1 } from '../../../alerts_filter_query';
import {
  ruleNotifyWhen as ruleNotifyWhenV1,
  ruleExecutionStatusValues as ruleExecutionStatusValuesV1,
  ruleExecutionStatusErrorReason as ruleExecutionStatusErrorReasonV1,
  ruleExecutionStatusWarningReason as ruleExecutionStatusWarningReasonV1,
  ruleLastRunOutcomeValues as ruleLastRunOutcomeValuesV1,
} from '../../common/constants/v1';
import { validateNotifyWhenV1 } from '../../validation';

export const ruleParamsZodSchema = z.union([
  customThresholdZodParamsSchemaV1.describe('Custom threshold rule type params'),
  metricThresholdZodParamsSchemaV1.describe('Metric threshold rule type params'),
  esQueryZodParamsSchemaV1.describe('ES query rule type params'),
]);
export const actionParamsZodSchema = z.record(z.string(), z.optional(z.any()));
export const mappedParamsZodSchema = z.record(z.string(), z.optional(z.any()));

export const notifyWhenZodSchema = z.union([
  z.literal(ruleNotifyWhenV1.CHANGE),
  z.literal(ruleNotifyWhenV1.ACTIVE),
  z.literal(ruleNotifyWhenV1.THROTTLE),
]).superRefine(validateNotifyWhenV1);

const intervalScheduleZodSchema = z.object({
  interval: z.string(),
});

const actionFrequencyZodSchema = z.object({
  summary: z.boolean(),
  notify_when: notifyWhenZodSchema,
  throttle: z.nullable(z.string()),
});

const actionAlertsFilterZodSchema = z.object({
  query: z.optional(alertsFilterQueryZodSchemaV1),
  timeframe: z.optional(
    z.object({
      days: z.array(
        z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
          z.literal(7),
        ])
      ),
      hours: z.object({
        start: z.string(),
        end: z.string(),
      }),
      timezone: z.string(),
    })
  ),
});

const actionZodSchema = z.object({
  uuid: z.optional(z.string()),
  group: z.string(),
  id: z.string(),
  connector_type_id: z.string(),
  params: actionParamsZodSchema,
  frequency: z.optional(actionFrequencyZodSchema),
  alerts_filter: z.optional(actionAlertsFilterZodSchema),
});

export const ruleExecutionStatusZodSchema = z.object({
  status: z.union([
    z.literal(ruleExecutionStatusValuesV1.OK),
    z.literal(ruleExecutionStatusValuesV1.ACTIVE),
    z.literal(ruleExecutionStatusValuesV1.ERROR),
    z.literal(ruleExecutionStatusValuesV1.WARNING),
    z.literal(ruleExecutionStatusValuesV1.PENDING),
    z.literal(ruleExecutionStatusValuesV1.UNKNOWN),
  ]),
  last_execution_date: z.string(),
  last_duration: z.optional(z.number()),
  error: z.optional(
    z.object({
      reason: z.union([
        z.literal(ruleExecutionStatusErrorReasonV1.READ),
        z.literal(ruleExecutionStatusErrorReasonV1.DECRYPT),
        z.literal(ruleExecutionStatusErrorReasonV1.EXECUTE),
        z.literal(ruleExecutionStatusErrorReasonV1.UNKNOWN),
        z.literal(ruleExecutionStatusErrorReasonV1.LICENSE),
        z.literal(ruleExecutionStatusErrorReasonV1.TIMEOUT),
        z.literal(ruleExecutionStatusErrorReasonV1.DISABLED),
        z.literal(ruleExecutionStatusErrorReasonV1.VALIDATE),
      ]),
      message: z.string(),
    })
  ),
  warning: z.optional(
    z.object({
      reason: z.union([
        z.literal(ruleExecutionStatusWarningReasonV1.MAX_EXECUTABLE_ACTIONS),
        z.literal(ruleExecutionStatusWarningReasonV1.MAX_ALERTS),
        z.literal(ruleExecutionStatusWarningReasonV1.MAX_QUEUED_ACTIONS),
      ]),
      message: z.string(),
    })
  ),
});

export const ruleLastRunZodSchema = z.object({
  outcome: z.union([
    z.literal(ruleLastRunOutcomeValuesV1.SUCCEEDED),
    z.literal(ruleLastRunOutcomeValuesV1.WARNING),
    z.literal(ruleLastRunOutcomeValuesV1.FAILED),
  ]),
  outcome_order: z.optional(z.number()),
  warning: z.optional(
    z.nullable(
      z.union([
        z.literal(ruleExecutionStatusErrorReasonV1.READ),
        z.literal(ruleExecutionStatusErrorReasonV1.DECRYPT),
        z.literal(ruleExecutionStatusErrorReasonV1.EXECUTE),
        z.literal(ruleExecutionStatusErrorReasonV1.UNKNOWN),
        z.literal(ruleExecutionStatusErrorReasonV1.LICENSE),
        z.literal(ruleExecutionStatusErrorReasonV1.TIMEOUT),
        z.literal(ruleExecutionStatusErrorReasonV1.DISABLED),
        z.literal(ruleExecutionStatusErrorReasonV1.VALIDATE),
        z.literal(ruleExecutionStatusWarningReasonV1.MAX_EXECUTABLE_ACTIONS),
        z.literal(ruleExecutionStatusWarningReasonV1.MAX_ALERTS),
        z.literal(ruleExecutionStatusWarningReasonV1.MAX_QUEUED_ACTIONS),
      ])
    )
  ),
  outcome_msg: z.optional(z.nullable(z.array(z.string()))),
  alerts_count: z.object({
    active: z.optional(z.nullable(z.number())),
    new: z.optional(z.nullable(z.number())),
    recovered: z.optional(z.nullable(z.number())),
    ignored: z.optional(z.nullable(z.number())),
  }),
});

export const monitoringZodSchema = z.object({
  run: z.object({
    history: z.array(
      z.object({
        success: z.boolean(),
        timestamp: z.number(),
        duration: z.optional(z.number()),
        outcome: z.optional(ruleLastRunZodSchema),
      })
    ),
    calculated_metrics: z.object({
      p50: z.optional(z.number()),
      p95: z.optional(z.number()),
      p99: z.optional(z.number()),
      success_ratio: z.number(),
    }),
    last_run: z.object({
      timestamp: z.string(),
      metrics: z.object({
        duration: z.optional(z.number()),
        total_search_duration_ms: z.optional(z.nullable(z.number())),
        total_indexing_duration_ms: z.optional(z.nullable(z.number())),
        total_alerts_detected: z.optional(z.nullable(z.number())),
        total_alerts_created: z.optional(z.nullable(z.number())),
        gap_duration_s: z.optional(z.nullable(z.number())),
      }),
    }),
  }),
});

export const ruleSnoozeScheduleZodSchema = z.object({
  id: z.optional(z.string()),
  duration: z.number(),
  rRule: rRuleResponseZodSchemaV1,
  skipRecurrences: z.optional(z.array(z.string())),
});

export const alertDelayZodSchema = z.object({
  active: z.number(),
});

export const ruleResponseZodSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  name: z.string(),
  tags: z.array(z.string()),
  rule_type_id: z.string(),
  consumer: z.string(),
  schedule: intervalScheduleZodSchema,
  actions: z.array(actionZodSchema),
  params: ruleParamsZodSchema,
  mapped_params: z.optional(mappedParamsZodSchema),
  scheduled_task_id: z.optional(z.string()),
  created_by: z.nullable(z.string()),
  updated_by: z.nullable(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
  api_key_owner: z.nullable(z.string()),
  api_key_created_by_user: z.optional(z.nullable(z.boolean())),
  throttle: z.optional(z.nullable(z.string())),
  mute_all: z.boolean(),
  notify_when: z.optional(z.nullable(notifyWhenZodSchema)),
  muted_alert_ids: z.array(z.string()),
  execution_status: ruleExecutionStatusZodSchema,
  monitoring: z.optional(monitoringZodSchema),
  snooze_schedule: z.optional(z.array(ruleSnoozeScheduleZodSchema)),
  active_snoozes: z.optional(z.array(z.string())),
  is_snoozed_until: z.optional(z.nullable(z.string())),
  last_run: z.optional(z.nullable(ruleLastRunZodSchema)),
  next_run: z.optional(z.nullable(z.string())),
  revision: z.number(),
  running: z.optional(z.nullable(z.boolean())),
  view_in_app_relative_url: z.optional(z.nullable(z.string())),
  alert_delay: z.optional(alertDelayZodSchema),
});

export const scheduleIdsZodSchema = z.optional(z.array(z.string()));
