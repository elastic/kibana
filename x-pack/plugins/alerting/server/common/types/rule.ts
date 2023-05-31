/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectAttributes } from '@kbn/core/server';
import { Filter } from '@kbn/es-query';
import { IsoWeekday } from '../../../common';
import { RuleMonitoringAttributes } from './monitoring';
import { RuleSnoozeScheduleAttributes } from './snooze_schedule';
import { RuleLastRunAttributes, RuleExecutionStatusAttributes } from './status';

export enum RuleNotifyWhen {
  CHANGE = 'onActionGroupChange',
  ACTIVE = 'onActiveAlert',
  THROTTLE = 'onThrottleInterval',
}

interface IntervaleScheduleAttributes {
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
  schedule: IntervaleScheduleAttributes; //
  actions: RuleActionAttributes[]; //
  params: SavedObjectAttributes;
  mapped_params?: MappedParamsAttributes; //
  scheduledTaskId?: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  apiKey: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser?: boolean | null;
  throttle?: string | null;
  notifyWhen?: RuleNotifyWhen | null; //
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: RuleMetaAttributes; //
  executionStatus: RuleExecutionStatusAttributes; //
  monitoring?: RuleMonitoringAttributes; //
  snoozeSchedule?: RuleSnoozeScheduleAttributes[]; //
  isSnoozedUntil?: string | null;
  lastRun?: RuleLastRunAttributes | null; //
  nextRun?: string | null;
  revision: number;
  running?: boolean | null;
}
