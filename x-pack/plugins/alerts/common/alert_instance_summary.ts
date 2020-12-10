/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type AlertStatusValues = 'OK' | 'Active' | 'Error';
export type AlertInstanceStatusValues = 'OK' | 'Active';

export interface AlertInstanceSummary {
  id: string;
  name: string;
  tags: string[];
  alertTypeId: string;
  consumer: string;
  muteAll: boolean;
  throttle: string | null;
  enabled: boolean;
  statusStartDate: string;
  statusEndDate: string;
  status: AlertStatusValues;
  lastRun?: string;
  errorMessages: Array<{ date: string; message: string }>;
  instances: Record<string, AlertInstanceStatus>;
}

export interface AlertInstanceStatus {
  status: AlertInstanceStatusValues;
  muted: boolean;
  actionGroupId?: string;
  actionSubgroup?: string;
  activeStartDate?: string;
}
