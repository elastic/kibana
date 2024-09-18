/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleDomain, Rule, RuleParams } from '../types';

interface TransformRuleDomainToRuleOptions {
  isPublic?: boolean;
  includeLegacyId?: boolean;
}

export const transformRuleDomainToRule = <Params extends RuleParams = never>(
  ruleDomain: RuleDomain<Params>,
  options?: TransformRuleDomainToRuleOptions
): Rule<Params> => {
  const { isPublic = false, includeLegacyId = false } = options || {};

  const rule: Rule<Params> = {
    id: ruleDomain.id,
    enabled: ruleDomain.enabled,
    name: ruleDomain.name,
    tags: ruleDomain.tags,
    alertTypeId: ruleDomain.alertTypeId,
    consumer: ruleDomain.consumer,
    schedule: ruleDomain.schedule,
    actions: ruleDomain.actions,
    systemActions: ruleDomain.systemActions,
    params: ruleDomain.params,
    mapped_params: ruleDomain.mapped_params,
    scheduledTaskId: ruleDomain.scheduledTaskId,
    createdBy: ruleDomain.createdBy,
    updatedBy: ruleDomain.updatedBy,
    createdAt: ruleDomain.createdAt,
    updatedAt: ruleDomain.updatedAt,
    apiKeyOwner: ruleDomain.apiKeyOwner,
    apiKeyCreatedByUser: ruleDomain.apiKeyCreatedByUser,
    throttle: ruleDomain.throttle,
    muteAll: ruleDomain.muteAll,
    notifyWhen: ruleDomain.notifyWhen,
    mutedInstanceIds: ruleDomain.mutedInstanceIds,
    executionStatus: ruleDomain.executionStatus,
    monitoring: ruleDomain.monitoring,
    snoozeSchedule: ruleDomain.snoozeSchedule,
    activeSnoozes: ruleDomain.activeSnoozes,
    isSnoozedUntil: ruleDomain.isSnoozedUntil,
    lastRun: ruleDomain.lastRun,
    nextRun: ruleDomain.nextRun,
    revision: ruleDomain.revision,
    running: ruleDomain.running,
    viewInAppRelativeUrl: ruleDomain.viewInAppRelativeUrl,
    alertDelay: ruleDomain.alertDelay,
    legacyId: ruleDomain.legacyId,
  };

  if (isPublic) {
    delete rule.snoozeSchedule;
    delete rule.activeSnoozes;
    delete rule.isSnoozedUntil;
    delete rule.monitoring;
    delete rule.viewInAppRelativeUrl;
  }

  if (!includeLegacyId) {
    delete rule.legacyId;
  }

  // Remove all undefined keys to clean up the object
  type RuleKeys = keyof Rule;
  for (const key in rule) {
    if (rule[key as RuleKeys] === undefined) {
      delete rule[key as RuleKeys];
    }
  }
  return rule;
};
