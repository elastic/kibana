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

export * from './v2';
import {
  rRuleSchema as rRuleSchemaV2,
  rawRuleAlertsFilterSchema as rawRuleAlertsFilterSchemaV2,
  rawRuleSchema as rawRuleSchemaV2,
  rawRuleActionSchema as rawRuleActionSchemaV2,
  rawRuleExecutionStatusSchema as rawRuleExecutionStatusSchemaV2,
  rawRuleLastRunSchema as rawRuleLastRunSchemaV2,
} from './v2';

export const executionStatusWarningReason = schema.oneOf([
  schema.literal(RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS),
  schema.literal(RuleExecutionStatusWarningReasons.MAX_ALERTS),
  schema.literal(RuleExecutionStatusWarningReasons.MAX_QUEUED_ACTIONS),
  schema.literal(RuleExecutionStatusWarningReasons.EXECUTION),
]);

export const executionStatusErrorReason = schema.oneOf([
  schema.literal(RuleExecutionStatusErrorReasons.Read),
  schema.literal(RuleExecutionStatusErrorReasons.Decrypt),
  schema.literal(RuleExecutionStatusErrorReasons.Execute),
  schema.literal(RuleExecutionStatusErrorReasons.Unknown),
  schema.literal(RuleExecutionStatusErrorReasons.License),
  schema.literal(RuleExecutionStatusErrorReasons.Timeout),
  schema.literal(RuleExecutionStatusErrorReasons.Disabled),
  schema.literal(RuleExecutionStatusErrorReasons.Validate),
]);

export const outcome = schema.oneOf([
  schema.literal(ruleLastRunOutcomeValues.SUCCEEDED),
  schema.literal(ruleLastRunOutcomeValues.WARNING),
  schema.literal(ruleLastRunOutcomeValues.FAILED),
]);

export const rRuleSchema = rRuleSchemaV2.extends({
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

export const rawRuleAlertsFilterSchema = rawRuleAlertsFilterSchemaV2.extends({
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
});

export const rawRuleActionSchema = rawRuleActionSchemaV2.extends({
  uuid: schema.string(),
  alertsFilter: schema.maybe(rawRuleAlertsFilterSchema),
});

export const rawRuleLastRunSchema = rawRuleLastRunSchemaV2.extends({
  outcome,
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

export const rawRuleExecutionStatusSchema = rawRuleExecutionStatusSchemaV2.extends({
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

export const rawRuleSchema = rawRuleSchemaV2.extends({
  executionStatus: rawRuleExecutionStatusSchema,
  actions: schema.arrayOf(rawRuleActionSchema),
  lastRun: schema.maybe(schema.nullable(rawRuleLastRunSchema)),
  monitoring: schema.maybe(rawRuleMonitoringSchema),
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
});
