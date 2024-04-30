/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleType } from '../../types';
import { InitialRule } from '../sections/rule_form/rule_reducer';

/**
 * NOTE: Applications that want to show the alerting UIs will need to add
 * check against their features here until we have a better solution. This
 * will possibly go away with https://github.com/elastic/kibana/issues/52300.
 */

type Capabilities = Record<string, any>;

export const hasShowActionsCapability = (capabilities: Capabilities) => capabilities?.actions?.show;
export const hasSaveActionsCapability = (capabilities: Capabilities) => capabilities?.actions?.save;
export const hasExecuteActionsCapability = (capabilities: Capabilities, actionTypeId?: string) =>
  actionTypeId === '.sentinelone' ? capabilities?.actions?.save : capabilities?.actions?.execute;
export const hasDeleteActionsCapability = (capabilities: Capabilities) =>
  capabilities?.actions?.delete;

export function hasAllPrivilege(
  ruleConsumer: InitialRule['consumer'],
  ruleType?: RuleType
): boolean {
  const consumers = Array.isArray(ruleConsumer) ? ruleConsumer : [ruleConsumer];

  return consumers.every((consumer) => ruleType?.authorizedConsumers[consumer]?.all ?? false);
}

export function hasAllPrivilegeForSomeConsumer(
  ruleConsumer: InitialRule['consumer'],
  ruleType?: RuleType
): boolean {
  return ruleConsumer.some((consumer) => ruleType?.authorizedConsumers[consumer]?.all ?? false);
}

export function hasAllPrivilegeWithProducerCheck(
  ruleConsumer: InitialRule['consumer'],
  ruleType?: RuleType
): boolean {
  if (ruleType?.producer && ruleConsumer.includes(ruleType?.producer)) {
    return true;
  }
  return hasAllPrivilege(ruleConsumer, ruleType);
}

export function hasReadPrivilege(rule: InitialRule, ruleType?: RuleType): boolean {
  return rule.consumer.every((consumer) => ruleType?.authorizedConsumers[consumer]?.read ?? false);
}

export const hasManageApiKeysCapability = (capabilities: Capabilities) =>
  capabilities?.management?.security?.api_keys;
