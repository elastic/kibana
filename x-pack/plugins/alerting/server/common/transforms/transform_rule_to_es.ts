/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Rule } from '../types';
import { RuleAttributes } from '../types/persisted';
import { getMappedParams } from '../../rules_client/common';

interface TransformRuleToEsParams {
  legacyId: RuleAttributes['legacyId'];
  actionsWithRefs: RuleAttributes['actions'];
  paramsWithRefs: RuleAttributes['params'];
  meta?: RuleAttributes['meta'];
}

export const transformRuleToEs = (
  rule: Omit<Rule, 'actions' | 'params'>,
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
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    apiKey: rule.apiKey,
    apiKeyOwner: rule.apiKeyOwner,
    apiKeyCreatedByUser: rule.apiKeyCreatedByUser,
    throttle: rule.throttle,
    notifyWhen: rule.notifyWhen,
    muteAll: rule.muteAll,
    mutedInstanceIds: rule.mutedInstanceIds,
    executionStatus: rule.executionStatus,
    monitoring: rule.monitoring,
    snoozeSchedule: rule.snoozeSchedule,
    isSnoozedUntil: rule.isSnoozedUntil,
    lastRun: rule.lastRun,
    nextRun: rule.nextRun,
    revision: rule.revision,
    running: rule.running,
    ...(meta ? { meta } : {}),
    ...(Object.keys(mappedParams).length ? { mapped_params: mappedParams } : {}),
  };
};
