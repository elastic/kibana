/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttribute, SavedObjectAttributes } from 'kibana/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AlertTypeState = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AlertTypeParams = Record<string, any>;

export interface IntervalSchedule extends SavedObjectAttributes {
  interval: string;
}

// for the `typeof ThingValues[number]` types below, become string types that
// only accept the values in the associated string arrays
export const AlertExecutionStatusValues = ['ok', 'active', 'error', 'pending', 'unknown'] as const;
export type AlertExecutionStatuses = typeof AlertExecutionStatusValues[number];

export enum AlertExecutionStatusErrorReasons {
  Read = 'read',
  Decrypt = 'decrypt',
  Execute = 'execute',
  Unknown = 'unknown',
}

export interface AlertExecutionStatus {
  status: AlertExecutionStatuses;
  lastExecutionDate: Date;
  error?: {
    reason: AlertExecutionStatusErrorReasons;
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
}

export interface Alert {
  id: string;
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string;
  consumer: string;
  schedule: IntervalSchedule;
  actions: AlertAction[];
  params: AlertTypeParams;
  scheduledTaskId?: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  apiKey: string | null;
  apiKeyOwner: string | null;
  throttle: string | null;
  notifyOnlyOnActionGroupChange: boolean;
  muteAll: boolean;
  mutedInstanceIds: string[];
  executionStatus: AlertExecutionStatus;
}

export type SanitizedAlert = Omit<Alert, 'apiKey'>;

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
