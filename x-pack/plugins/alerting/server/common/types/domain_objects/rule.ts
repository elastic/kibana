/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';

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

export type RuleParams = TypeOf<typeof ruleParamsSchema>;
export type RRule = TypeOf<typeof rRuleSchema>;
export type SnoozeSchedule = TypeOf<typeof snoozeScheduleSchema>;
export type RuleExecutionStatus = TypeOf<typeof ruleExecutionStatusSchema>;
export type RuleLastRun = TypeOf<typeof ruleLastRunSchema>;
export type Monitoring = TypeOf<typeof monitoringSchema>;
export type Action = TypeOf<typeof actionSchema>;
export type ActionFrequency = TypeOf<typeof actionFrequencySchema>;
export type AlertsFilter = TypeOf<typeof actionAlertsFilterSchema>;

type RuleSchemaType = TypeOf<typeof ruleSchema>;
type AlertsFilterQuery = TypeOf<typeof actionAlertsFilterQuerySchema>;

export interface Rule<Params extends RuleParams = never> {
  id: RuleSchemaType['id'];
  enabled: RuleSchemaType['enabled'];
  name: RuleSchemaType['name'];
  tags: RuleSchemaType['tags'];
  alertTypeId: RuleSchemaType['alertTypeId'];
  consumer: RuleSchemaType['consumer'];
  schedule: RuleSchemaType['schedule'];
  actions: RuleSchemaType['actions'];
  params: Params;
  mapped_params?: RuleSchemaType['mapped_params'];
  scheduledTaskId?: RuleSchemaType['scheduledTaskId'];
  createdBy: RuleSchemaType['createdBy'];
  updatedBy: RuleSchemaType['updatedBy'];
  createdAt: RuleSchemaType['createdAt'];
  updatedAt: RuleSchemaType['updatedAt'];
  apiKey: RuleSchemaType['apiKey'];
  apiKeyOwner: RuleSchemaType['apiKeyOwner'];
  apiKeyCreatedByUser?: RuleSchemaType['apiKeyCreatedByUser'];
  throttle?: RuleSchemaType['throttle'];
  muteAll: RuleSchemaType['muteAll'];
  notifyWhen?: RuleSchemaType['notifyWhen'];
  mutedInstanceIds: RuleSchemaType['mutedInstanceIds'];
  executionStatus: RuleSchemaType['executionStatus'];
  monitoring?: RuleSchemaType['monitoring'];
  snoozeSchedule?: RuleSchemaType['snoozeSchedule'];
  activeSnoozes?: RuleSchemaType['activeSnoozes'];
  isSnoozedUntil?: RuleSchemaType['isSnoozedUntil'];
  lastRun?: RuleSchemaType['lastRun'];
  nextRun?: RuleSchemaType['nextRun'];
  revision: RuleSchemaType['revision'];
  running?: RuleSchemaType['running'];
  viewInAppRelativeUrl?: RuleSchemaType['viewInAppRelativeUrl'];
}

export interface PublicRule<Params extends RuleParams = never> {
  id: RuleSchemaType['id'];
  enabled: RuleSchemaType['enabled'];
  name: RuleSchemaType['name'];
  tags: RuleSchemaType['tags'];
  alertTypeId: RuleSchemaType['alertTypeId'];
  consumer: RuleSchemaType['consumer'];
  schedule: RuleSchemaType['schedule'];
  actions: RuleSchemaType['actions'];
  params: Params;
  scheduledTaskId?: RuleSchemaType['scheduledTaskId'];
  createdBy: RuleSchemaType['createdBy'];
  updatedBy: RuleSchemaType['updatedBy'];
  createdAt: RuleSchemaType['createdAt'];
  updatedAt: RuleSchemaType['updatedAt'];
  apiKey: RuleSchemaType['apiKey'];
  apiKeyOwner: RuleSchemaType['apiKeyOwner'];
  apiKeyCreatedByUser?: RuleSchemaType['apiKeyCreatedByUser'];
  throttle?: RuleSchemaType['throttle'];
  muteAll: RuleSchemaType['muteAll'];
  notifyWhen?: RuleSchemaType['notifyWhen'];
  mutedInstanceIds: RuleSchemaType['mutedInstanceIds'];
  executionStatus: RuleSchemaType['executionStatus'];
  isSnoozedUntil?: RuleSchemaType['isSnoozedUntil'];
  lastRun?: RuleSchemaType['lastRun'];
  nextRun?: RuleSchemaType['nextRun'];
  revision: RuleSchemaType['revision'];
  running?: RuleSchemaType['running'];
  viewInAppRelativeUrl?: RuleSchemaType['viewInAppRelativeUrl'];
}

export interface SanitizedAlertsFilter {
  query?: {
    kql: AlertsFilterQuery['kql'];
    filters: AlertsFilterQuery['filters'];
  };
  timeframe?: AlertsFilter['timeframe'];
}

export interface SanitizedAction {
  uuid?: Action['uuid'];
  group: Action['group'];
  id: Action['id'];
  actionTypeId: Action['actionTypeId'];
  params: Action['params'];
  frequency?: Action['frequency'];
  alertsFilter?: SanitizedAlertsFilter;
}

export interface SanitizedRule<Params extends RuleParams = never> {
  id: RuleSchemaType['id'];
  enabled: RuleSchemaType['enabled'];
  name: RuleSchemaType['name'];
  tags: RuleSchemaType['tags'];
  alertTypeId: RuleSchemaType['alertTypeId'];
  consumer: RuleSchemaType['consumer'];
  schedule: RuleSchemaType['schedule'];
  actions: SanitizedAction[];
  params: Params;
  mapped_params?: RuleSchemaType['mapped_params'];
  scheduledTaskId?: RuleSchemaType['scheduledTaskId'];
  createdBy: RuleSchemaType['createdBy'];
  updatedBy: RuleSchemaType['updatedBy'];
  createdAt: RuleSchemaType['createdAt'];
  updatedAt: RuleSchemaType['updatedAt'];
  apiKeyOwner: RuleSchemaType['apiKeyOwner'];
  apiKeyCreatedByUser?: RuleSchemaType['apiKeyCreatedByUser'];
  throttle?: RuleSchemaType['throttle'];
  muteAll: RuleSchemaType['muteAll'];
  notifyWhen?: RuleSchemaType['notifyWhen'];
  mutedInstanceIds: RuleSchemaType['mutedInstanceIds'];
  executionStatus: RuleSchemaType['executionStatus'];
  monitoring?: RuleSchemaType['monitoring'];
  snoozeSchedule?: RuleSchemaType['snoozeSchedule'];
  activeSnoozes?: RuleSchemaType['activeSnoozes'];
  isSnoozedUntil?: RuleSchemaType['isSnoozedUntil'];
  lastRun?: RuleSchemaType['lastRun'];
  nextRun?: RuleSchemaType['nextRun'];
  revision: RuleSchemaType['revision'];
  running?: RuleSchemaType['running'];
  viewInAppRelativeUrl?: RuleSchemaType['viewInAppRelativeUrl'];
}

const ruleParamsSchema = schema.recordOf(schema.string(), schema.any());
const actionParamsSchema = schema.recordOf(schema.string(), schema.any());
const mappedParamsSchema = schema.recordOf(schema.string(), schema.any());

const actionAlertsFilterQuerySchema = schema.object({
  kql: schema.string(),
  filters: schema.arrayOf(
    schema.object({
      query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
      meta: schema.recordOf(schema.string(), schema.any()),
      state$: schema.maybe(schema.object({ store: schema.string() })),
    })
  ),
  dsl: schema.maybe(schema.string()),
});

const actionAlertsFilterTimeFrameSchema = schema.object({
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
});

const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(actionAlertsFilterQuerySchema),
  timeframe: schema.maybe(actionAlertsFilterTimeFrameSchema),
});

const notifyWhenSchema = schema.oneOf([
  schema.literal(RuleNotifyWhen.CHANGE),
  schema.literal(RuleNotifyWhen.ACTIVE),
  schema.literal(RuleNotifyWhen.THROTTLE),
]);

const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notifyWhen: notifyWhenSchema,
  throttle: schema.nullable(schema.string()),
});

const actionSchema = schema.object({
  uuid: schema.maybe(schema.string()),
  group: schema.string(),
  id: schema.string(),
  actionTypeId: schema.string(),
  params: actionParamsSchema,
  frequency: schema.maybe(actionFrequencySchema),
  alertsFilter: schema.maybe(actionAlertsFilterSchema),
});

const intervalScheduleSchema = schema.object({
  interval: schema.string(),
});

const ruleExecutionStatusSchema = schema.object({
  status: schema.oneOf([
    schema.literal(RuleExecutionStatusValues.OK),
    schema.literal(RuleExecutionStatusValues.ACTIVE),
    schema.literal(RuleExecutionStatusValues.ERROR),
    schema.literal(RuleExecutionStatusValues.WARNING),
    schema.literal(RuleExecutionStatusValues.PENDING),
    schema.literal(RuleExecutionStatusValues.UNKNOWN),
  ]),
  lastExecutionDate: schema.string(),
  lastDuration: schema.maybe(schema.number()),
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

const ruleLastRunSchema = schema.object({
  outcome: schema.oneOf([
    schema.literal(RuleLastRunOutcomeValues.SUCCEEDED),
    schema.literal(RuleLastRunOutcomeValues.WARNING),
    schema.literal(RuleLastRunOutcomeValues.FAILED),
  ]),
  outcomeOrder: schema.maybe(schema.number()),
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
  outcomeMsg: schema.maybe(schema.nullable(schema.arrayOf(schema.string()))),
  alertsCount: schema.object({
    active: schema.maybe(schema.nullable(schema.number())),
    new: schema.maybe(schema.nullable(schema.number())),
    recovered: schema.maybe(schema.nullable(schema.number())),
    ignored: schema.maybe(schema.nullable(schema.number())),
  }),
});

const monitoringSchema = schema.object({
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

const rRuleSchema = schema.object({
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

export const ruleSchema = schema.object({
  id: schema.string(),
  enabled: schema.boolean(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  alertTypeId: schema.string(),
  consumer: schema.string(),
  schedule: intervalScheduleSchema,
  actions: schema.arrayOf(actionSchema),
  params: ruleParamsSchema,
  mapped_params: schema.maybe(mappedParamsSchema),
  scheduledTaskId: schema.maybe(schema.string()),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
  apiKey: schema.nullable(schema.string()),
  apiKeyOwner: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),
  throttle: schema.maybe(schema.nullable(schema.string())),
  muteAll: schema.boolean(),
  notifyWhen: schema.maybe(schema.nullable(notifyWhenSchema)),
  mutedInstanceIds: schema.arrayOf(schema.string()),
  executionStatus: ruleExecutionStatusSchema,
  monitoring: schema.maybe(monitoringSchema),
  snoozeSchedule: schema.maybe(schema.arrayOf(snoozeScheduleSchema)),
  activeSnoozes: schema.maybe(schema.arrayOf(schema.string())),
  isSnoozedUntil: schema.maybe(schema.nullable(schema.string())),
  lastRun: schema.maybe(schema.nullable(ruleLastRunSchema)),
  nextRun: schema.maybe(schema.nullable(schema.string())),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
  viewInAppRelativeUrl: schema.maybe(schema.nullable(schema.string())),
});
