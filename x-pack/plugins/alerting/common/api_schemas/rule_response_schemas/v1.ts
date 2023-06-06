/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export enum RuleNotifyWhen {
  CHANGE = 'onActionGroupChange',
  ACTIVE = 'onActiveAlert',
  THROTTLE = 'onThrottleInterval',
}

export enum RuleLastRunOutcomeValues {
  SUCCEEDED = 'succeeded',
  WARNING = 'warning',
  FAILED = 'failed',
}

export enum RuleExecutionStatusValues {
  OK = 'ok',
  ACTIVE = 'active',
  ERROR = 'error',
  WARNING = 'warning',
  PENDING = 'pending',
  UNKNOWN = 'unknown',
}

export enum RuleExecutionStatusErrorReason {
  READ = 'read',
  DECRYPT = 'decrypt',
  EXECUTE = 'execute',
  UNKNOWN = 'unknown',
  LICENSE = 'license',
  TIMEOUT = 'timeout',
  DISABLED = 'disabled',
  VALIDATE = 'validate',
}

export enum RuleExecutionStatusWarningReason {
  MAX_EXECUTABLE_ACTIONS = 'maxExecutableActions',
  MAX_ALERTS = 'maxAlerts',
}

export const ruleParamsSchema = schema.recordOf(schema.string(), schema.any());
export const actionParamsSchema = schema.recordOf(schema.string(), schema.any());
export const mappedParamsSchema = schema.recordOf(schema.string(), schema.any());

const notifyWhenSchema = schema.oneOf([
  schema.literal(RuleNotifyWhen.CHANGE),
  schema.literal(RuleNotifyWhen.ACTIVE),
  schema.literal(RuleNotifyWhen.THROTTLE),
]);

const intervalScheduleSchema = schema.object({
  interval: schema.string(),
});

const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notify_when: notifyWhenSchema,
  throttle: schema.nullable(schema.string()),
});

const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(
    schema.object({
      kql: schema.string(),
      filters: schema.arrayOf(
        schema.object({
          query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          meta: schema.recordOf(schema.string(), schema.any()),
          state$: schema.maybe(schema.object({ store: schema.string() })),
        })
      ),
    })
  ),
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
  group: schema.string(),
  id: schema.string(),
  connector_type_id: schema.string(),
  params: actionParamsSchema,
  frequency: schema.maybe(actionFrequencySchema),
  alerts_filter: schema.maybe(actionAlertsFilterSchema),
});

export const ruleExecutionStatusSchema = schema.object({
  status: schema.oneOf([
    schema.literal(RuleExecutionStatusValues.OK),
    schema.literal(RuleExecutionStatusValues.ACTIVE),
    schema.literal(RuleExecutionStatusValues.ERROR),
    schema.literal(RuleExecutionStatusValues.WARNING),
    schema.literal(RuleExecutionStatusValues.PENDING),
    schema.literal(RuleExecutionStatusValues.UNKNOWN),
  ]),
  last_execution_date: schema.string(),
  last_duration: schema.maybe(schema.number()),
  error: schema.maybe(
    schema.object({
      reason: schema.oneOf([
        schema.literal(RuleExecutionStatusErrorReason.READ),
        schema.literal(RuleExecutionStatusErrorReason.DECRYPT),
        schema.literal(RuleExecutionStatusErrorReason.EXECUTE),
        schema.literal(RuleExecutionStatusErrorReason.UNKNOWN),
        schema.literal(RuleExecutionStatusErrorReason.LICENSE),
        schema.literal(RuleExecutionStatusErrorReason.TIMEOUT),
        schema.literal(RuleExecutionStatusErrorReason.DISABLED),
        schema.literal(RuleExecutionStatusErrorReason.VALIDATE),
      ]),
      message: schema.string(),
    })
  ),
  warning: schema.maybe(
    schema.object({
      reason: schema.oneOf([
        schema.literal(RuleExecutionStatusWarningReason.MAX_EXECUTABLE_ACTIONS),
        schema.literal(RuleExecutionStatusWarningReason.MAX_ALERTS),
      ]),
      message: schema.string(),
    })
  ),
});

export const ruleLastRunSchema = schema.object({
  outcome: schema.oneOf([
    schema.literal(RuleLastRunOutcomeValues.SUCCEEDED),
    schema.literal(RuleLastRunOutcomeValues.WARNING),
    schema.literal(RuleLastRunOutcomeValues.FAILED),
  ]),
  outcome_order: schema.maybe(schema.number()),
  warning: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal(RuleExecutionStatusErrorReason.READ),
        schema.literal(RuleExecutionStatusErrorReason.DECRYPT),
        schema.literal(RuleExecutionStatusErrorReason.EXECUTE),
        schema.literal(RuleExecutionStatusErrorReason.UNKNOWN),
        schema.literal(RuleExecutionStatusErrorReason.LICENSE),
        schema.literal(RuleExecutionStatusErrorReason.TIMEOUT),
        schema.literal(RuleExecutionStatusErrorReason.DISABLED),
        schema.literal(RuleExecutionStatusErrorReason.VALIDATE),
        schema.literal(RuleExecutionStatusWarningReason.MAX_EXECUTABLE_ACTIONS),
        schema.literal(RuleExecutionStatusWarningReason.MAX_ALERTS),
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

export const rRuleSchema = schema.object({
  dtstart: schema.string(),
  tzid: schema.string(),
  freq: schema.maybe(
    schema.oneOf([
      schema.literal(0),
      schema.literal(1),
      schema.literal(2),
      schema.literal(3),
      schema.literal(4),
      schema.literal(5),
      schema.literal(6),
    ])
  ),
  until: schema.maybe(schema.string()),
  count: schema.maybe(schema.number()),
  interval: schema.maybe(schema.number()),
  wkst: schema.maybe(
    schema.oneOf([
      schema.literal('MO'),
      schema.literal('TU'),
      schema.literal('WE'),
      schema.literal('TH'),
      schema.literal('FR'),
      schema.literal('SA'),
      schema.literal('SU'),
    ])
  ),
  byweekday: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
  bymonth: schema.maybe(schema.arrayOf(schema.number())),
  bysetpos: schema.maybe(schema.arrayOf(schema.number())),
  bymonthday: schema.arrayOf(schema.number()),
  byyearday: schema.arrayOf(schema.number()),
  byweekno: schema.arrayOf(schema.number()),
  byhour: schema.arrayOf(schema.number()),
  byminute: schema.arrayOf(schema.number()),
  bysecond: schema.arrayOf(schema.number()),
});

const snoozeScheduleSchema = schema.object({
  duration: schema.number(),
  rRule: rRuleSchema,
  id: schema.maybe(schema.string()),
  skipRecurrences: schema.maybe(schema.arrayOf(schema.string())),
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
  snooze_schedule: schema.maybe(schema.arrayOf(snoozeScheduleSchema)),
  active_snoozes: schema.maybe(schema.arrayOf(schema.string())),
  is_snoozed_until: schema.maybe(schema.nullable(schema.string())),
  last_run: schema.maybe(schema.nullable(ruleLastRunSchema)),
  next_run: schema.maybe(schema.nullable(schema.string())),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
  view_in_app_relative_url: schema.maybe(schema.nullable(schema.string())),
});

export const publicRuleResponseSchema = schema.object({
  id: schema.string(),
  enabled: schema.boolean(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  rule_type_id: schema.string(),
  consumer: schema.string(),
  schedule: intervalScheduleSchema,
  actions: schema.arrayOf(actionSchema),
  params: ruleParamsSchema,
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
  is_snoozed_until: schema.maybe(schema.nullable(schema.string())),
  last_run: schema.maybe(schema.nullable(ruleLastRunSchema)),
  next_run: schema.maybe(schema.nullable(schema.string())),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
});
