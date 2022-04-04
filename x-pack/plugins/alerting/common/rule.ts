/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectsResolveResponse,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from 'kibana/server';
import { RuleExecutionMetrics } from '.';
import { RuleNotifyWhenType } from './rule_notify_when_type';

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

export enum RuleExecutionStatusErrorReasons {
  Read = 'read',
  Decrypt = 'decrypt',
  Execute = 'execute',
  Unknown = 'unknown',
  License = 'license',
  Timeout = 'timeout',
  Disabled = 'disabled',
}

export enum RuleExecutionStatusWarningReasons {
  MAX_EXECUTABLE_ACTIONS = 'maxExecutableActions',
}

export interface RuleExecutionStatus {
  status: RuleExecutionStatuses;
  numberOfTriggeredActions?: number;
  numberOfScheduledActions?: number;
  metrics?: RuleExecutionMetrics;
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
  group: string;
  id: string;
  actionTypeId: string;
  params: RuleActionParams;
}

export interface RuleAggregations {
  alertExecutionStatus: { [status: string]: number };
  ruleEnabledStatus: { enabled: number; disabled: number };
  ruleMutedStatus: { muted: number; unmuted: number };
  ruleSnoozedStatus: { snoozed: number };
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
  throttle: string | null;
  notifyWhen: RuleNotifyWhenType | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  executionStatus: RuleExecutionStatus;
  monitoring?: RuleMonitoring;
  snoozeEndTime?: Date | null; // Remove ? when this parameter is made available in the public API
}

export type SanitizedRule<Params extends RuleTypeParams = never> = Omit<Rule<Params>, 'apiKey'>;
export type ResolvedSanitizedRule<Params extends RuleTypeParams = never> = SanitizedRule<Params> &
  Omit<SavedObjectsResolveResponse, 'saved_object'>;

export type SanitizedRuleConfig = Pick<
  SanitizedRule,
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
}

export interface RuleMonitoring extends SavedObjectAttributes {
  execution: {
    history: RuleMonitoringHistory[];
    calculated_metrics: {
      p50?: number;
      p95?: number;
      p99?: number;
      success_ratio: number;
    };
  };
}
