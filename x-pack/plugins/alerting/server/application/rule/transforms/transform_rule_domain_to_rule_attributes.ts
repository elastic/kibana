/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleDomain } from '../types';
import { RuleAttributes } from '../../../data/rule/types';
import { getMappedParams } from '../../../rules_client/common';

interface TransformRuleToEsParams {
  legacyId: RuleAttributes['legacyId'];
  actionsWithRefs: RuleAttributes['actions'];
  paramsWithRefs: RuleAttributes['params'];
  meta?: RuleAttributes['meta'];
}

export const transformRuleDomainToRuleAttributes = (
  rule: Omit<RuleDomain, 'actions' | 'params'>,
  params: TransformRuleToEsParams
): RuleAttributes => {
  const { legacyId, actionsWithRefs, paramsWithRefs, meta } = params;
  const mappedParams = getMappedParams(paramsWithRefs);

  return {
    name: rule.name,
    tags: rule.tags,
    enabled: rule.enabled,
    alertTypeId: rule.alertTypeId,
    consumer: rule.consumer,
    legacyId,
    schedule: rule.schedule,
    actions: actionsWithRefs,
    params: paramsWithRefs,
    scheduledTaskId: rule.scheduledTaskId,
    createdBy: rule.createdBy,
    updatedBy: rule.updatedBy,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    apiKey: rule.apiKey,
    apiKeyOwner: rule.apiKeyOwner,
    apiKeyCreatedByUser: rule.apiKeyCreatedByUser,
    throttle: rule.throttle,
    notifyWhen: rule.notifyWhen,
    muteAll: rule.muteAll,
    mutedInstanceIds: rule.mutedInstanceIds,
    executionStatus: {
      status: rule.executionStatus.status,
      lastExecutionDate: rule.executionStatus.lastExecutionDate.toISOString(),
      ...(rule.executionStatus.lastDuration
        ? { lastDuration: rule.executionStatus.lastDuration }
        : {}),
      ...(rule.executionStatus.error ? { error: rule.executionStatus.error } : {}),
      ...(rule.executionStatus.warning ? { warning: rule.executionStatus.warning } : {}),
    },
    monitoring: rule.monitoring,
    snoozeSchedule: rule.snoozeSchedule,
    isSnoozedUntil: rule.isSnoozedUntil?.toISOString(),
    lastRun: rule.lastRun,
    nextRun: rule.nextRun?.toISOString(),
    revision: rule.revision,
    running: rule.running,
    ...(meta ? { meta } : {}),
    ...(Object.keys(mappedParams).length ? { mapped_params: mappedParams } : {}),
  };
};
