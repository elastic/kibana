/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectsResolveResponse,
} from '@kbn/core/server';
import type { Filter, KueryNode } from '@kbn/es-query';
import { schema } from '@kbn/config-schema';
import { IsoWeekday } from './iso_weekdays';
import { RuleNotifyWhenType } from './rule_notify_when_type';
import { RuleSnooze } from './rule_snooze_type';

export type RuleTypeState = Record<string, unknown>;
export type RuleTypeParams = Record<string, unknown>;

export interface IntervalSchedule extends SavedObjectAttributes {
  interval: string;
}

// for the `typeof ThingValues[number]` types below, become string types that
// only accept the values in the associated string arrays
export const RuleExecutionStatusValues = [
  'ok',
  'active',
  'error',
  'pending',
  'unknown',
  'warning',
] as const;
export type RuleExecutionStatuses = typeof RuleExecutionStatusValues[number];

export const RuleLastRunOutcomeValues = ['succeeded', 'warning', 'failed'] as const;
export type RuleLastRunOutcomes = typeof RuleLastRunOutcomeValues[number];

export const RuleLastRunOutcomeOrderMap: Record<RuleLastRunOutcomes, number> = {
  succeeded: 0,
  warning: 10,
  failed: 20,
};

export enum RuleExecutionStatusErrorReasons {
  Read = 'read',
  Decrypt = 'decrypt',
  Execute = 'execute',
  Unknown = 'unknown',
  License = 'license',
  Timeout = 'timeout',
  Disabled = 'disabled',
  Validate = 'validate',
}

export enum RuleExecutionStatusWarningReasons {
  MAX_EXECUTABLE_ACTIONS = 'maxExecutableActions',
  MAX_ALERTS = 'maxAlerts',
}

export type RuleAlertingOutcome = 'failure' | 'success' | 'unknown' | 'warning';

export interface RuleExecutionStatus {
  status: RuleExecutionStatuses;
  lastExecutionDate: Date;
  lastDuration?: number;
  error?: {
    reason: RuleExecutionStatusErrorReasons;
    message: string;
  };
  warning?: {
    reason: RuleExecutionStatusWarningReasons;
    message: string;
  };
}

export type RuleActionParams = SavedObjectAttributes;
export type RuleActionParam = SavedObjectAttribute;

export interface RuleActionFrequency extends SavedObjectAttributes {
  summary: boolean;
  notifyWhen: RuleNotifyWhenType;
  throttle: string | null;
}

export interface AlertsFilterTimeframe extends SavedObjectAttributes {
  days: IsoWeekday[];
  timezone: string;
  hours: {
    start: string;
    end: string;
  };
}

export interface AlertsFilter extends SavedObjectAttributes {
  query?: {
    kql: string;
    filters: Filter[];
    dsl?: string; // This fields is generated in the code by using "kql", therefore it's not optional but defined as optional to avoid modifying a lot of files in different plugins
  };
  timeframe?: AlertsFilterTimeframe;
}

export type RuleActionAlertsFilterProperty = AlertsFilterTimeframe | RuleActionParam;

export interface RuleAction {
  uuid?: string;
  group: string;
  id: string;
  actionTypeId: string;
  params: RuleActionParams;
  frequency?: RuleActionFrequency;
  alertsFilter?: AlertsFilter;
}

export interface AggregateOptions {
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  hasReference?: {
    type: string;
    id: string;
  };
  filter?: string | KueryNode;
  page?: number;
  perPage?: number;
}

export interface RuleAggregationFormattedResult {
  ruleExecutionStatus: { [status: string]: number };
  ruleLastRunOutcome: { [status: string]: number };
  ruleEnabledStatus: { enabled: number; disabled: number };
  ruleMutedStatus: { muted: number; unmuted: number };
  ruleSnoozedStatus: { snoozed: number };
  ruleTags: string[];
}

export interface RuleLastRun {
  outcome: RuleLastRunOutcomes;
  outcomeOrder?: number;
  warning?: RuleExecutionStatusErrorReasons | RuleExecutionStatusWarningReasons | null;
  outcomeMsg?: string[] | null;
  alertsCount: {
    active?: number | null;
    new?: number | null;
    recovered?: number | null;
    ignored?: number | null;
  };
}

export interface MappedParamsProperties {
  risk_score?: number;
  severity?: string;
}

export type MappedParams = SavedObjectAttributes & MappedParamsProperties;

export interface Rule<Params extends RuleTypeParams = never> {
  id: string;
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string; // this is persisted in the Rule saved object so we would need a migration to change this to ruleTypeId
  consumer: string;
  schedule: IntervalSchedule;
  actions: RuleAction[];
  params: Params;
  mapped_params?: MappedParams;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  apiKey: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser?: boolean | null;
  throttle?: string | null;
  muteAll: boolean;
  notifyWhen?: RuleNotifyWhenType | null;
  mutedInstanceIds: string[];
  executionStatus: RuleExecutionStatus;
  monitoring?: RuleMonitoring;
  snoozeSchedule?: RuleSnooze; // Remove ? when this parameter is made available in the public API
  activeSnoozes?: string[];
  isSnoozedUntil?: Date | null;
  lastRun?: RuleLastRun | null;
  nextRun?: Date | null;
  revision: number;
  running?: boolean | null;
  viewInAppRelativeUrl?: string;
}

export interface SanitizedAlertsFilter extends AlertsFilter {
  query?: {
    kql: string;
    filters: Filter[];
  };
  timeframe?: AlertsFilterTimeframe;
}

export type SanitizedRuleAction = Omit<RuleAction, 'alertsFilter'> & {
  alertsFilter?: SanitizedAlertsFilter;
};

export type SanitizedRule<Params extends RuleTypeParams = never> = Omit<
  Rule<Params>,
  'apiKey' | 'actions'
> & { actions: SanitizedRuleAction[] };

export type ResolvedSanitizedRule<Params extends RuleTypeParams = never> = SanitizedRule<Params> &
  Omit<SavedObjectsResolveResponse, 'saved_object'>;

export type SanitizedRuleConfig = Pick<
  SanitizedRule,
  | 'id'
  | 'name'
  | 'tags'
  | 'consumer'
  | 'enabled'
  | 'schedule'
  | 'actions'
  | 'createdBy'
  | 'updatedBy'
  | 'createdAt'
  | 'updatedAt'
  | 'throttle'
  | 'notifyWhen'
  | 'muteAll'
  | 'revision'
  | 'snoozeSchedule'
> & {
  producer: string;
  ruleTypeId: string;
  ruleTypeName: string;
};

export enum HealthStatus {
  OK = 'ok',
  Warning = 'warn',
  Error = 'error',
}

export interface AlertsHealth {
  decryptionHealth: {
    status: HealthStatus;
    timestamp: string;
  };
  executionHealth: {
    status: HealthStatus;
    timestamp: string;
  };
  readHealth: {
    status: HealthStatus;
    timestamp: string;
  };
}

export interface ActionVariable {
  name: string;
  description: string;
  deprecated?: boolean;
  useWithTripleBracesInTemplates?: boolean;
  usesPublicBaseUrl?: boolean;
}

export interface RuleMonitoringHistory extends SavedObjectAttributes {
  success: boolean;
  timestamp: number;
  duration?: number;
  outcome?: RuleLastRunOutcomes;
}

export interface RuleMonitoringCalculatedMetrics extends SavedObjectAttributes {
  p50?: number;
  p95?: number;
  p99?: number;
  success_ratio: number;
}

export interface RuleMonitoringLastRunMetrics extends SavedObjectAttributes {
  duration?: number;
  total_search_duration_ms?: number | null;
  total_indexing_duration_ms?: number | null;
  total_alerts_detected?: number | null;
  total_alerts_created?: number | null;
  gap_duration_s?: number | null;
}

export interface RuleMonitoringLastRun extends SavedObjectAttributes {
  timestamp: string;
  metrics: RuleMonitoringLastRunMetrics;
}

export interface RuleMonitoring {
  run: {
    history: RuleMonitoringHistory[];
    calculated_metrics: RuleMonitoringCalculatedMetrics;
    last_run: RuleMonitoringLastRun;
  };
}
const executionStatusErrorReason = schema.oneOf([
  schema.literal('read'),
  schema.literal('decrypt'),
  schema.literal('execute'),
  schema.literal('unknown'),
  schema.literal('license'),
  schema.literal('timeout'),
  schema.literal('disabled'),
  schema.literal('validate'),
]);

const executionStatusWarningReason = schema.oneOf([
  schema.literal('maxExecutableActions'),
  schema.literal('maxAlerts'),
]);

const outcome = schema.oneOf([
  schema.literal('succeeded'),
  schema.literal('warning'),
  schema.literal('failed'),
]);

export const ruleTypeSchema = schema.object({
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
  scheduledTaskId: schema.nullable(schema.string()),
  isSnoozedUntil: schema.maybe(schema.nullable(schema.string())),
  snoozeSchedule: schema.maybe(
    schema.arrayOf(
      schema.object({
        duration: schema.number(),
        rRule: schema.object({
          dtstart: schema.string(),
          tzid: schema.string(),
        }),
        id: schema.maybe(schema.string()),
        skipRecurrences: schema.maybe(schema.arrayOf(schema.string())),
      })
    )
  ),
  meta: schema.maybe(schema.object({ versionApiKeyLastmodified: schema.maybe(schema.string()) })),
  actions: schema.arrayOf(
    schema.object({
      uuid: schema.maybe(schema.string()),
      group: schema.string(),
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
      alertsFilter: schema.maybe(
        schema.object({
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
              dsl: schema.maybe(schema.string()),
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
        })
      ),
    })
  ),
  executionStatus: schema.object({
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
        reason: executionStatusErrorReason,
        message: schema.string(),
      })
    ),
  }),
  notifyWhen: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal('onActionGroupChange'),
        schema.literal('onActiveAlert'),
        schema.literal('onThrottleInterval'),
      ])
    )
  ),
  monitoring: schema.maybe(
    schema.object({
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
    })
  ),
  lastRun: schema.maybe(
    schema.nullable(
      schema.object({
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
      })
    )
  ),
  nextRun: schema.maybe(schema.nullable(schema.string())),
  mapped_params: schema.maybe(
    schema.object({
      risk_score: schema.maybe(schema.number()),
      severity: schema.maybe(schema.string()),
    })
  ),
});
