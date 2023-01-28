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

export interface RuleAction {
  uuid: string;
  group: string;
  id: string;
  actionTypeId: string;
  params: RuleActionParams;
  frequency?: {
    summary: boolean;
    notifyWhen: RuleNotifyWhenType;
    throttle: string | null;
  };
}

export interface RuleAggregations {
  alertExecutionStatus: { [status: string]: number };
  ruleLastRunOutcome: { [status: string]: number };
  ruleEnabledStatus: { enabled: number; disabled: number };
  ruleMutedStatus: { muted: number; unmuted: number };
  ruleSnoozedStatus: { snoozed: number };
  ruleTags: string[];
}

export interface RuleLastRun {
  outcome: RuleLastRunOutcomes;
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
  running?: boolean | null;
}

export type SanitizedRule<Params extends RuleTypeParams = never> = Omit<Rule<Params>, 'apiKey'>;
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
