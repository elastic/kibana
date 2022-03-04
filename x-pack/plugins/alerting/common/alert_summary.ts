/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleStatusValues = 'OK' | 'Active' | 'Error';
export type AlertStatusValues = 'OK' | 'Active';

export interface ExecutionDuration {
  average: number;
  valuesWithTimestamp: Record<string, number>;
}

export interface AlertSummary {
  id: string;
  name: string;
  tags: string[];
  ruleTypeId: string;
  consumer: string;
  muteAll: boolean;
  throttle: string | null;
  enabled: boolean;
  statusStartDate: string;
  statusEndDate: string;
  status: RuleStatusValues;
  lastRun?: string;
  errorMessages: Array<{ date: string; message: string }>;
  alerts: Record<string, AlertStatus>;
  executionDuration: ExecutionDuration;
}

export interface AlertStatus {
  status: AlertStatusValues;
  muted: boolean;
  actionGroupId?: string;
  actionSubgroup?: string;
  activeStartDate?: string;
}
