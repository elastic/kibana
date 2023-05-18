/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { Rule, RuleType, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import type { RecursiveReadonly } from '@kbn/utility-types';
import { hasAllPrivilege } from './has_all_privilege';

interface CanEditRuleProps {
  rule: Rule<RuleTypeParams> | undefined;
  ruleTypeDefinition: RuleType | undefined;
  capabilities: RecursiveReadonly<Capabilities>;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}

export function canEditRule({
  rule,
  ruleTypeDefinition,
  capabilities,
  ruleTypeRegistry,
}: CanEditRuleProps): boolean {
  const canExecuteActions = capabilities?.actions?.execute;

  return Boolean(
    // can the user save the rule
    rule &&
      hasAllPrivilege(rule, ruleTypeDefinition) &&
      // if the rule has actions, can the user save the rule's action params
      (canExecuteActions || (!canExecuteActions && rule.actions.length === 0)) &&
      // is this rule type editable from within Rules Management
      (ruleTypeRegistry.has(rule.ruleTypeId)
        ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
        : false)
  );
}
