/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectAttributes } from '@kbn/core/server';
import { IsoWeekday } from '../../../../common';
import {
  ruleNotifyWhenAttributes,
  ruleLastRunOutcomeValuesAttributes,
  ruleExecutionStatusValuesAttributes,
  ruleExecutionStatusErrorReasonAttributes,
  ruleExecutionStatusWarningReasonAttributes,
} from '../constants';
import { RRuleAttributes } from '../../r_rule/types';
import { AlertsFilterQueryAttributes } from '../../alerts_filter_query/types';

export type RuleNotifyWhenAttributes =
  (typeof ruleNotifyWhenAttributes)[keyof typeof ruleNotifyWhenAttributes];
export type RuleLastRunOutcomeValuesAttributes =
  (typeof ruleLastRunOutcomeValuesAttributes)[keyof typeof ruleLastRunOutcomeValuesAttributes];
export type RuleExecutionStatusValuesAttributes =
  (typeof ruleExecutionStatusValuesAttributes)[keyof typeof ruleExecutionStatusValuesAttributes];
export type RuleExecutionStatusErrorReasonAttributes =
  (typeof ruleExecutionStatusErrorReasonAttributes)[keyof typeof ruleExecutionStatusErrorReasonAttributes];
export type RuleExecutionStatusWarningReasonAttributes =
  (typeof ruleExecutionStatusWarningReasonAttributes)[keyof typeof ruleExecutionStatusWarningReasonAttributes];

export interface RuleSnoozeScheduleAttributes {
  duration: number;
  rRule: RRuleAttributes;
  id?: string;
  skipRecurrences?: string[];
}

export interface RuleExecutionStatusAttributes {
  status: RuleExecutionStatusValuesAttributes;
  lastExecutionDate: string;
  lastDuration?: number;
  error?: {
    reason: RuleExecutionStatusErrorReasonAttributes;
    message: string;
  } | null;
  warning?: {
    reason: RuleExecutionStatusWarningReasonAttributes;
    message: string;
  } | null;
}

export interface RuleLastRunAttributes {
  outcome: RuleLastRunOutcomeValuesAttributes;
  outcomeOrder?: number;
  warning?:
    | RuleExecutionStatusErrorReasonAttributes
    | RuleExecutionStatusWarningReasonAttributes
    | null;
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

export interface AlertsFilterAttributes {
  query?: AlertsFilterQueryAttributes;
  timeframe?: AlertsFilterTimeFrameAttributes;
}

export interface RuleActionAttributes {
  uuid: string;
  group?: string;
  actionRef: string;
  actionTypeId: string;
  params: SavedObjectAttributes;
  frequency?: {
    summary: boolean;
    notifyWhen: RuleNotifyWhenAttributes;
    throttle: string | null;
  };
  alertsFilter?: AlertsFilterAttributes;
  useAlertDataAsTemplate?: boolean;
}

type MappedParamsAttributes = SavedObjectAttributes & {
  risk_score?: number;
  severity?: string;
};

interface RuleMetaAttributes {
  versionApiKeyLastmodified?: string;
}

interface AlertDelayAttributes {
  active: number;
}

interface FlappingAttributes {
  lookBackWindow: number;
  statusChangeThreshold: number;
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
  notifyWhen?: RuleNotifyWhenAttributes | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: RuleMetaAttributes;
  executionStatus?: RuleExecutionStatusAttributes;
  monitoring?: RuleMonitoringAttributes;
  snoozeSchedule?: RuleSnoozeScheduleAttributes[];
  isSnoozedUntil?: string | null;
  lastRun?: RuleLastRunAttributes | null;
  nextRun?: string | null;
  revision: number;
  running?: boolean | null;
  alertDelay?: AlertDelayAttributes;
  flapping?: FlappingAttributes | null;
}
