/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export interface RuleMonitoringSummary {
  id: string;
  name: string;
  tags: string[];
  rule_type_id: string;
  consumer: string;
  mute_all: boolean;
  throttle: string | null;
  enabled: boolean;
  start_date: string;
  end_date: string;
  avg_duration: number;
  avg_delay: number;
  executions: RuleExecutionSummary[];
}

export interface RuleExecutionSummary {
  start?: string;
  end?: string;
  delay?: number;
  outcome?: string;
  duration?: number;
  status?: string;
  num_recovered_alerts: number;
  recovered_alert_ids: string[];
  num_new_alerts: number;
  new_alert_ids: string[];
  num_active_alerts: number;
  active_alert_ids: string[];
  execution_status: string;
  error_message?: string;
}
