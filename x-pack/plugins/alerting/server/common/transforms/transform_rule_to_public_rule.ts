/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule, PublicRule, RuleParams } from '../types';

export const transformRuleToPublicRule = <Params extends RuleParams = never>(
  rule: Rule<Params>
): PublicRule<Params> => {
  return {
    id: rule.id,
    enabled: rule.enabled,
    name: rule.name,
    tags: rule.tags,
    alertTypeId: rule.alertTypeId,
    consumer: rule.consumer,
    schedule: rule.schedule,
    actions: rule.actions,
    params: rule.params,
    ...(rule.scheduledTaskId ? { scheduledTaskId: rule.scheduledTaskId } : {}),
    createdBy: rule.createdBy,
    updatedBy: rule.updatedBy,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    apiKey: rule.apiKey,
    apiKeyOwner: rule.apiKeyOwner,
    ...(rule.apiKeyCreatedByUser ? { apiKeyCreatedByUser: rule.apiKeyCreatedByUser } : {}),
    ...(rule.throttle ? { throttle: rule.throttle } : {}),
    muteAll: rule.muteAll,
    ...(rule.notifyWhen ? { notifyWhen: rule.notifyWhen } : {}),
    mutedInstanceIds: rule.mutedInstanceIds,
    executionStatus: rule.executionStatus,
    ...(rule.isSnoozedUntil ? { isSnoozedUntil: rule.isSnoozedUntil } : {}),
    ...(rule.lastRun ? { lastRun: rule.lastRun } : {}),
    ...(rule.nextRun ? { nextRun: rule.nextRun } : {}),
    revision: rule.revision,
    ...(rule.running ? { running: rule.running } : {}),
  };
};
