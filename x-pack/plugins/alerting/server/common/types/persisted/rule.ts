/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectAttributes } from '@kbn/core/server';
import { Filter } from '@kbn/es-query';
import type { WeekdayStr } from 'rrule';
import { IsoWeekday } from '../../../../common';

enum RuleNotifyWhen {
  CHANGE = 'onActionGroupChange',
  ACTIVE = 'onActiveAlert',
  THROTTLE = 'onThrottleInterval',
}

enum RuleLastRunOutcomeValues {
  SUCCEEDED = 'succeeded',
  WARNING = 'warning',
  FAILED = 'failed',
}

enum RuleExecutionStatusValues {
  OK = 'ok',
  ACTIVE = 'active',
  ERROR = 'error',
  WARNING = 'warning',
  PENDING = 'pending',
  UNKNOWN = 'unknown',
}

enum RuleExecutionStatusErrorReason {
  READ = 'read',
  DECRYPT = 'decrypt',
  EXECUTE = 'execute',
  UNKNOWN = 'unknown',
  LICENSE = 'license',
  TIMEOUT = 'timeout',
  DISABLED = 'disabled',
  VALIDATE = 'validate',
}

enum RuleExecutionStatusWarningReason {
  MAX_EXECUTABLE_ACTIONS = 'maxExecutableActions',
  MAX_ALERTS = 'maxAlerts',
}

type RRuleFreq = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RRuleAttributes {
  dtstart: string;
  tzid: string;
  freq?: RRuleFreq;
  until?: string;
  count?: number;
  interval?: number;
  wkst?: WeekdayStr;
  byweekday?: Array<string | number>;
  bymonth?: number[];
  bysetpos?: number[];
  bymonthday: number[];
  byyearday: number[];
  byweekno: number[];
  byhour: number[];
  byminute: number[];
  bysecond: number[];
}

export interface RuleSnoozeScheduleAttributes {
  duration: number;
  rRule: RRuleAttributes;
  id?: string;
  skipRecurrences?: string[];
}

export interface RuleExecutionStatusAttributes {
  status: RuleExecutionStatusValues;
  lastExecutionDate: string;
  lastDuration?: number;
  error?: {
    reason: RuleExecutionStatusErrorReason;
    message: string;
  } | null;
  warning?: {
    reason: RuleExecutionStatusWarningReason;
    message: string;
  } | null;
}

export interface RuleLastRunAttributes {
  outcome: RuleLastRunOutcomeValues;
  outcomeOrder?: number;
  warning?: RuleExecutionStatusErrorReason | RuleExecutionStatusWarningReason | null;
  outcomeMsg?: string[] | null;
  alertsCount: {
    active?: number | null;
    new?: number | null;
    recovered?: number | null;
    ignored?: number | null;
  };
}

export interface RuleMonitoringHistoryAttributes {
  success: boolean;
  timestamp: number;
  duration?: number;
  outcome?: RuleLastRunAttributes;
}

export interface RuleMonitoringCalculatedMetricsAttributes {
  p50?: number;
  p95?: number;
  p99?: number;
  success_ratio: number;
}

export interface RuleMonitoringLastRunMetricsAttributes {
  duration?: number;
  total_search_duration_ms?: number | null;
  total_indexing_duration_ms?: number | null;
  total_alerts_detected?: number | null;
  total_alerts_created?: number | null;
  gap_duration_s?: number | null;
}

export interface RuleMonitoringLastRunAttributes {
  timestamp: string;
  metrics: RuleMonitoringLastRunMetricsAttributes;
}

export interface RuleMonitoringAttributes {
  run: {
    history: RuleMonitoringHistoryAttributes[];
    calculated_metrics: RuleMonitoringCalculatedMetricsAttributes;
    last_run: RuleMonitoringLastRunAttributes;
  };
}

interface IntervaleScheduleAttributes extends SavedObjectAttributes {
  interval: string;
}

interface AlertsFilterTimeFrameAttributes {
  days: IsoWeekday[];
  timezone: string;
  hours: {
    start: string;
    end: string;
  };
}

interface AlertsFilterAttributes {
  query?: {
    kql: string;
    filters: Filter[];
    dsl: string;
  };
  timeframe?: AlertsFilterTimeFrameAttributes;
}

interface RuleActionAttributes {
  uuid: string;
  group: string;
  actionRef: string;
  actionTypeId: string;
  params: SavedObjectAttributes;
  frequency?: {
    summary: boolean;
    notifyWhen: RuleNotifyWhen;
    throttle: string | null;
  };
  alertsFilter?: AlertsFilterAttributes;
}

type MappedParamsAttributes = SavedObjectAttributes & {
  risk_score?: number;
  severity?: string;
};

interface RuleMetaAttributes {
  versionApiKeyLastmodified?: string;
}

export interface RuleAttributes {
  name: string;
  tags: string[];
  enabled: boolean;
  alertTypeId: string;
  consumer: string;
  legacyId: string | null;
  schedule: IntervaleScheduleAttributes;
  actions: RuleActionAttributes[];
  params: SavedObjectAttributes;
  mapped_params?: MappedParamsAttributes;
  scheduledTaskId?: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  apiKey: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser?: boolean | null;
  throttle?: string | null;
  notifyWhen?: RuleNotifyWhen | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: RuleMetaAttributes;
  executionStatus: RuleExecutionStatusAttributes;
  monitoring?: RuleMonitoringAttributes;
  snoozeSchedule?: RuleSnoozeScheduleAttributes[];
  isSnoozedUntil?: string | null;
  lastRun?: RuleLastRunAttributes | null;
  nextRun?: string | null;
  revision: number;
  running?: boolean | null;
}
