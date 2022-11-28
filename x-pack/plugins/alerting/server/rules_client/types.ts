/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '@kbn/security-plugin/server';
import {
  Rule,
  PartialRule,
  RawRule,
  RuleTypeRegistry,
  RuleAction,
  IntervalSchedule,
  SanitizedRule,
  RuleTaskState,
  AlertSummary,
  RuleExecutionStatusValues,
  RuleLastRunOutcomeValues,
  RuleNotifyWhenType,
  RuleTypeParams,
  ResolvedSanitizedRule,
  RuleWithLegacyId,
  SanitizedRuleWithLegacyId,
  PartialRuleWithLegacyId,
  RuleSnooze,
  RuleSnoozeSchedule,
  RawAlertInstance as RawAlert,
} from '../types';

export type NormalizedAlertAction = Omit<RuleAction, 'actionTypeId'>;

export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };

export interface SavedObjectOptions {
  id?: string;
  migrationVersion?: Record<string, string>;
}

export interface ScheduleTaskOptions {
  id: string;
  consumer: string;
  ruleTypeId: string;
  schedule: IntervalSchedule;
  throwOnConflict: boolean; // whether to throw conflict errors or swallow them
}
