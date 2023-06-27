/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  ruleNotifyWhen,
  ruleLastRunOutcomeValues,
  ruleExecutionStatusValues,
  ruleExecutionStatusErrorReason,
  ruleExecutionStatusWarningReason,
} from '../constants';
import {
  ruleParamsSchema,
  rRuleSchema,
  snoozeScheduleSchema,
  ruleExecutionStatusSchema,
  ruleLastRunSchema,
  monitoringSchema,
  actionSchema,
  ruleSchema,
  ruleDomainSchema,
} from '../schemas';

export type RuleNotifyWhen = typeof ruleNotifyWhen[keyof typeof ruleNotifyWhen];
export type RuleLastRunOutcomeValues =
  typeof ruleLastRunOutcomeValues[keyof typeof ruleLastRunOutcomeValues];
export type RuleExecutionStatusValues =
  typeof ruleExecutionStatusValues[keyof typeof ruleExecutionStatusValues];
export type RuleExecutionStatusErrorReason =
  typeof ruleExecutionStatusErrorReason[keyof typeof ruleExecutionStatusErrorReason];
export type RuleExecutionStatusWarningReason =
  typeof ruleExecutionStatusWarningReason[keyof typeof ruleExecutionStatusWarningReason];

export type RuleParams = TypeOf<typeof ruleParamsSchema>;
export type RRule = TypeOf<typeof rRuleSchema>;
export type SnoozeSchedule = TypeOf<typeof snoozeScheduleSchema>;
export type RuleExecutionStatus = TypeOf<typeof ruleExecutionStatusSchema>;
export type RuleLastRun = TypeOf<typeof ruleLastRunSchema>;
export type Monitoring = TypeOf<typeof monitoringSchema>;
export type Action = TypeOf<typeof actionSchema>;

type RuleSchemaType = TypeOf<typeof ruleSchema>;
type RuleDomainSchemaType = TypeOf<typeof ruleDomainSchema>;

export interface Rule<Params extends RuleParams = never> {
  id: RuleSchemaType['id'];
  enabled: RuleSchemaType['enabled'];
  name: RuleSchemaType['name'];
  tags: RuleSchemaType['tags'];
  alertTypeId: RuleSchemaType['alertTypeId'];
  consumer: RuleSchemaType['consumer'];
  schedule: RuleSchemaType['schedule'];
  actions: RuleSchemaType['actions'];
  params: Params;
  mapped_params?: RuleSchemaType['mapped_params'];
  scheduledTaskId?: RuleSchemaType['scheduledTaskId'];
  createdBy: RuleSchemaType['createdBy'];
  updatedBy: RuleSchemaType['updatedBy'];
  createdAt: RuleSchemaType['createdAt'];
  updatedAt: RuleSchemaType['updatedAt'];
  apiKeyOwner: RuleSchemaType['apiKeyOwner'];
  apiKeyCreatedByUser?: RuleSchemaType['apiKeyCreatedByUser'];
  throttle?: RuleSchemaType['throttle'];
  muteAll: RuleSchemaType['muteAll'];
  notifyWhen?: RuleSchemaType['notifyWhen'];
  mutedInstanceIds: RuleSchemaType['mutedInstanceIds'];
  executionStatus: RuleSchemaType['executionStatus'];
  monitoring?: RuleSchemaType['monitoring'];
  snoozeSchedule?: RuleSchemaType['snoozeSchedule'];
  activeSnoozes?: RuleSchemaType['activeSnoozes'];
  isSnoozedUntil?: RuleSchemaType['isSnoozedUntil'];
  lastRun?: RuleSchemaType['lastRun'];
  nextRun?: RuleSchemaType['nextRun'];
  revision: RuleSchemaType['revision'];
  running?: RuleSchemaType['running'];
  viewInAppRelativeUrl?: RuleSchemaType['viewInAppRelativeUrl'];
}

export interface RuleDomain<Params extends RuleParams = never> {
  id: RuleDomainSchemaType['id'];
  enabled: RuleDomainSchemaType['enabled'];
  name: RuleDomainSchemaType['name'];
  tags: RuleDomainSchemaType['tags'];
  alertTypeId: RuleDomainSchemaType['alertTypeId'];
  consumer: RuleDomainSchemaType['consumer'];
  schedule: RuleDomainSchemaType['schedule'];
  actions: RuleDomainSchemaType['actions'];
  params: Params;
  mapped_params?: RuleDomainSchemaType['mapped_params'];
  scheduledTaskId?: RuleDomainSchemaType['scheduledTaskId'];
  createdBy: RuleDomainSchemaType['createdBy'];
  updatedBy: RuleDomainSchemaType['updatedBy'];
  createdAt: RuleDomainSchemaType['createdAt'];
  updatedAt: RuleDomainSchemaType['updatedAt'];
  apiKey: RuleDomainSchemaType['apiKey'];
  apiKeyOwner: RuleDomainSchemaType['apiKeyOwner'];
  apiKeyCreatedByUser?: RuleDomainSchemaType['apiKeyCreatedByUser'];
  throttle?: RuleDomainSchemaType['throttle'];
  muteAll: RuleDomainSchemaType['muteAll'];
  notifyWhen?: RuleDomainSchemaType['notifyWhen'];
  mutedInstanceIds: RuleDomainSchemaType['mutedInstanceIds'];
  executionStatus: RuleDomainSchemaType['executionStatus'];
  monitoring?: RuleDomainSchemaType['monitoring'];
  snoozeSchedule?: RuleDomainSchemaType['snoozeSchedule'];
  activeSnoozes?: RuleDomainSchemaType['activeSnoozes'];
  isSnoozedUntil?: RuleDomainSchemaType['isSnoozedUntil'];
  lastRun?: RuleDomainSchemaType['lastRun'];
  nextRun?: RuleDomainSchemaType['nextRun'];
  revision: RuleDomainSchemaType['revision'];
  running?: RuleDomainSchemaType['running'];
  viewInAppRelativeUrl?: RuleDomainSchemaType['viewInAppRelativeUrl'];
}
