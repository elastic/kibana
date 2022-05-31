/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatuses } from '@kbn/alerting-plugin/common';
import { Rule, RuleTypeIndex, RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import {
  RULE_STATUS_OK,
  RULE_STATUS_ACTIVE,
  RULE_STATUS_ERROR,
  RULE_STATUS_PENDING,
  RULE_STATUS_UNKNOWN,
  RULE_STATUS_WARNING,
} from './translations';

export const DEFAULT_SEARCH_PAGE_SIZE: number = 25;

export function getHealthColor(status: RuleExecutionStatuses) {
  switch (status) {
    case 'active':
      return 'success';
    case 'error':
      return 'danger';
    case 'ok':
      return 'primary';
    case 'pending':
      return 'accent';
    default:
      return 'subdued';
  }
}

export const rulesStatusesTranslationsMapping = {
  ok: RULE_STATUS_OK,
  active: RULE_STATUS_ACTIVE,
  error: RULE_STATUS_ERROR,
  pending: RULE_STATUS_PENDING,
  unknown: RULE_STATUS_UNKNOWN,
  warning: RULE_STATUS_WARNING,
};

export const OBSERVABILITY_SOLUTIONS = ['logs', 'uptime', 'infrastructure', 'apm'];

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags' | 'notifyWhen'>;

export function hasAllPrivilege(rule: InitialRule, ruleType?: RuleType): boolean {
  return ruleType?.authorizedConsumers[rule.consumer]?.all ?? false;
}

export function convertRulesToTableItems(
  rules: Rule[],
  ruleTypeIndex: RuleTypeIndex,
  canExecuteActions: boolean
) {
  return rules.map((rule, index: number) => ({
    ...rule,
    index,
    actionsCount: rule.actions.length,
    ruleType: ruleTypeIndex.get(rule.ruleTypeId)?.name ?? rule.ruleTypeId,
    isEditable:
      hasAllPrivilege(rule, ruleTypeIndex.get(rule.ruleTypeId)) &&
      (canExecuteActions || (!canExecuteActions && !rule.actions.length)),
    enabledInLicense: !!ruleTypeIndex.get(rule.ruleTypeId)?.enabledInLicense,
  }));
}

type Capabilities = Record<string, any>;

export const hasExecuteActionsCapability = (capabilities: Capabilities) =>
  capabilities?.actions?.execute;
