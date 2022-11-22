/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatuses,
} from '@kbn/alerting-plugin/common';
import { Capabilities } from '@kbn/core-capabilities-common';
import { Rule, RuleType, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { RecursiveReadonly } from '@kbn/utility-types';
import { useMemo } from 'react';

import { ALERT_STATUS_LICENSE_ERROR, rulesStatusesTranslationsMapping } from './translations';

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

export function getStatusMessage(rule: Rule): string {
  return rule?.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License
    ? ALERT_STATUS_LICENSE_ERROR
    : rule
    ? rulesStatusesTranslationsMapping[rule.executionStatus.status]
    : '';
}

function hasAllPrivilege(rule: Rule, ruleType?: RuleType): boolean {
  return ruleType?.authorizedConsumers[rule.consumer]?.all ?? false;
}

export interface UseIsRuleEditableProps {
  capabilities: RecursiveReadonly<Capabilities>;
  rule: Rule | undefined;
  ruleType: RuleType<string, string> | undefined;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}

export function isRuleEditable({
  capabilities,
  rule,
  ruleType,
  ruleTypeRegistry,
}: UseIsRuleEditableProps) {
  if (!rule) {
    return false;
  }

  if (!hasAllPrivilege(rule, ruleType)) {
    return false;
  }

  if (!capabilities.actions?.execute && rule.actions.length !== 0) {
    return false;
  }

  try {
    return ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext === false;
  } catch (e) {
    return false;
  }
}

export function useIsRuleEditable({
  capabilities,
  rule,
  ruleType,
  ruleTypeRegistry,
}: UseIsRuleEditableProps): boolean {
  return useMemo(
    () => isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry }),
    [capabilities, rule, ruleType, ruleTypeRegistry]
  );
}
