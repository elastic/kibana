/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';
import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-types';
import { ruleLastRunOutcomeValues } from '../../../application/rule/constants';

const executionStatusWarningReason = schema.oneOf([
  schema.literal(RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS),
  schema.literal(RuleExecutionStatusWarningReasons.MAX_ALERTS),
  schema.literal(RuleExecutionStatusWarningReasons.MAX_QUEUED_ACTIONS),
  schema.literal(RuleExecutionStatusWarningReasons.EXECUTION),
]);

const executionStatusErrorReason = schema.oneOf([
  schema.literal(RuleExecutionStatusErrorReasons.Read),
  schema.literal(RuleExecutionStatusErrorReasons.Decrypt),
  schema.literal(RuleExecutionStatusErrorReasons.Execute),
  schema.literal(RuleExecutionStatusErrorReasons.Unknown),
  schema.literal(RuleExecutionStatusErrorReasons.License),
  schema.literal(RuleExecutionStatusErrorReasons.Timeout),
  schema.literal(RuleExecutionStatusErrorReasons.Disabled),
  schema.literal(RuleExecutionStatusErrorReasons.Validate),
]);

export const rawRuleExecutionStatusSchema = schema.object({
  status: schema.oneOf([
    schema.literal('ok'),
    schema.literal('active'),
    schema.literal('error'),
    schema.literal('pending'),
    schema.literal('unknown'),
    schema.literal('warning'),
  ]),
  lastExecutionDate: schema.string(),
  lastDuration: schema.maybe(schema.number()),
  error: schema.nullable(
    schema.object({
      reason: executionStatusErrorReason,
      message: schema.string(),
    })
  ),
  warning: schema.nullable(
    schema.object({
      reason: executionStatusWarningReason,
      message: schema.string(),
    })
  ),
});

const ISOWeekdaysSchema = schema.oneOf([
  schema.literal(1),
  schema.literal(2),
  schema.literal(3),
  schema.literal(4),
  schema.literal(5),
  schema.literal(6),
  schema.literal(7),
]);

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
  byweekday: schema.maybe(
    schema.nullable(schema.arrayOf(schema.oneOf([schema.string(), schema.number()])))
  ),
  bymonth: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  bysetpos: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  bymonthday: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  byyearday: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  byweekno: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  byhour: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  byminute: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
  bysecond: schema.maybe(schema.nullable(schema.arrayOf(schema.number()))),
});

const outcome = schema.oneOf([
  schema.literal(ruleLastRunOutcomeValues.SUCCEEDED),
  schema.literal(ruleLastRunOutcomeValues.WARNING),
  schema.literal(ruleLastRunOutcomeValues.FAILED),
]);

export const rawRuleLastRunSchema = schema.object({
  outcome,
  outcomeOrder: schema.maybe(schema.number()),
  alertsCount: schema.object({
    new: schema.maybe(schema.nullable(schema.number())),
    active: schema.maybe(schema.nullable(schema.number())),
    recovered: schema.maybe(schema.nullable(schema.number())),
    ignored: schema.maybe(schema.nullable(schema.number())),
  }),
  outcomeMsg: schema.maybe(schema.nullable(schema.arrayOf(schema.string()))),
  warning: schema.maybe(
    schema.nullable(schema.oneOf([executionStatusErrorReason, executionStatusWarningReason]))
  ),
});

export const rawRuleMonitoringSchema = schema.object({
  run: schema.object({
    history: schema.arrayOf(
      schema.object({
        success: schema.boolean(),
        timestamp: schema.number(),
        duration: schema.maybe(schema.number()),
        outcome: schema.maybe(outcome),
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

export const rawRuleAlertsFilterSchema = schema.object({
  query: schema.maybe(
    schema.object({
      kql: schema.string(),
      filters: schema.arrayOf(
        schema.object({
          query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          meta: schema.object({
            alias: schema.maybe(schema.nullable(schema.string())),
            disabled: schema.maybe(schema.boolean()),
            negate: schema.maybe(schema.boolean()),
            controlledBy: schema.maybe(schema.string()),
            group: schema.maybe(schema.string()),
            index: schema.maybe(schema.string()),
            isMultiIndex: schema.maybe(schema.boolean()),
            type: schema.maybe(schema.string()),
            key: schema.maybe(schema.string()),
            params: schema.maybe(schema.any()),
            value: schema.maybe(schema.string()),
            field: schema.maybe(schema.string()),
            relation: schema.maybe(schema.oneOf([schema.literal('OR'), schema.literal('AND')])),
          }),
          $state: schema.maybe(
            schema.object({
              store: schema.oneOf([
                schema.literal(FilterStateStore.APP_STATE),
                schema.literal(FilterStateStore.GLOBAL_STATE),
              ]),
            })
          ),
        })
      ),
      dsl: schema.string(),
    })
  ),
  timeframe: schema.maybe(
    schema.object({
      days: schema.arrayOf(ISOWeekdaysSchema),
      hours: schema.object({
        start: schema.string(),
        end: schema.string(),
      }),
      timezone: schema.string(),
    })
  ),
});

export const rawRuleActionSchema = schema.object({
  uuid: schema.string(),
  group: schema.maybe(schema.string()),
  actionRef: schema.string(),
  actionTypeId: schema.string(),
  params: schema.recordOf(schema.string(), schema.any()),
  frequency: schema.maybe(
    schema.object({
      summary: schema.boolean(),
      notifyWhen: schema.oneOf([
        schema.literal('onActionGroupChange'),
        schema.literal('onActiveAlert'),
        schema.literal('onThrottleInterval'),
      ]),
      throttle: schema.nullable(schema.string()),
    })
  ),
  alertsFilter: schema.maybe(rawRuleAlertsFilterSchema),
  useAlertDataForTemplate: schema.maybe(schema.boolean()),
});

export const alertDelaySchema = schema.object({
  active: schema.number(),
});

export const rawRuleSchema = schema.object({
  name: schema.string(),
  enabled: schema.boolean(),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string()),
  alertTypeId: schema.string(),
  apiKeyOwner: schema.nullable(schema.string()),
  apiKey: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  updatedAt: schema.string(),
  createdAt: schema.string(),
  muteAll: schema.boolean(),
  mutedInstanceIds: schema.arrayOf(schema.string()),
  throttle: schema.maybe(schema.nullable(schema.string())),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
  schedule: schema.object({
    interval: schema.string(),
  }),
  legacyId: schema.nullable(schema.string()),
  scheduledTaskId: schema.maybe(schema.nullable(schema.string())),
  isSnoozedUntil: schema.maybe(schema.nullable(schema.string())),
  snoozeSchedule: schema.maybe(
    schema.arrayOf(
      schema.object({
        duration: schema.number(),
        rRule: rRuleSchema,
        id: schema.maybe(schema.string()),
        skipRecurrences: schema.maybe(schema.arrayOf(schema.string())),
      })
    )
  ),
  meta: schema.maybe(schema.object({ versionApiKeyLastmodified: schema.maybe(schema.string()) })),
  actions: schema.arrayOf(rawRuleActionSchema),
  executionStatus: rawRuleExecutionStatusSchema,
  notifyWhen: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal('onActionGroupChange'),
        schema.literal('onActiveAlert'),
        schema.literal('onThrottleInterval'),
      ])
    )
  ),
  monitoring: schema.maybe(rawRuleMonitoringSchema),
  lastRun: schema.maybe(schema.nullable(rawRuleLastRunSchema)),
  nextRun: schema.maybe(schema.nullable(schema.string())),
  mapped_params: schema.maybe(
    schema.object({
      risk_score: schema.maybe(schema.number()),
      severity: schema.maybe(schema.string()),
    })
  ),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any())),
  typeVersion: schema.maybe(schema.number()),
  alertDelay: schema.maybe(alertDelaySchema),
});
