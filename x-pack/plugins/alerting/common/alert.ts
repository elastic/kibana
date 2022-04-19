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
} from 'kibana/server';
import { RuleExecutionMetrics } from '.';
import { AlertNotifyWhenType } from './alert_notify_when_type';

export type AlertTypeState = Record<string, unknown>;
export type AlertTypeParams = Record<string, unknown>;

export interface IntervalSchedule extends SavedObjectAttributes {
  interval: string;
}

// for the `typeof ThingValues[number]` types below, become string types that
// only accept the values in the associated string arrays
export const AlertExecutionStatusValues = [
  'ok',
  'active',
  'error',
  'pending',
  'unknown',
  'warning',
] as const;
export type AlertExecutionStatuses = typeof AlertExecutionStatusValues[number];

export enum AlertExecutionStatusErrorReasons {
  Read = 'read',
  Decrypt = 'decrypt',
  Execute = 'execute',
  Unknown = 'unknown',
  License = 'license',
  Timeout = 'timeout',
  Disabled = 'disabled',
}

export enum AlertExecutionStatusWarningReasons {
  MAX_EXECUTABLE_ACTIONS = 'maxExecutableActions',
}

export interface AlertExecutionStatus {
  status: AlertExecutionStatuses;
  numberOfTriggeredActions?: number;
  numberOfGeneratedActions?: number;
  metrics?: RuleExecutionMetrics;
  lastExecutionDate: Date;
  lastDuration?: number;
  error?: {
    reason: AlertExecutionStatusErrorReasons;
    message: string;
  };
  warning?: {
    reason: AlertExecutionStatusWarningReasons;
    message: string;
  };
}

export type AlertActionParams = SavedObjectAttributes;
export type AlertActionParam = SavedObjectAttribute;

export interface AlertAction {
  group: string;
  id: string;
  actionTypeId: string;
  params: AlertActionParams;
}

export interface AlertAggregations {
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

export interface Alert<Params extends AlertTypeParams = never> {
  id: string;
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string;
  consumer: string;
  schedule: IntervalSchedule;
  actions: AlertAction[];
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
  notifyWhen: AlertNotifyWhenType | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  executionStatus: AlertExecutionStatus;
  monitoring?: RuleMonitoring;
  snoozeEndTime?: Date | null; // Remove ? when this parameter is made available in the public API
}

export type SanitizedAlert<Params extends AlertTypeParams = never> = Omit<Alert<Params>, 'apiKey'>;
export type ResolvedSanitizedRule<Params extends AlertTypeParams = never> = SanitizedAlert<Params> &
  Omit<SavedObjectsResolveResponse, 'saved_object'>;

export type SanitizedRuleConfig = Pick<
  SanitizedAlert,
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
