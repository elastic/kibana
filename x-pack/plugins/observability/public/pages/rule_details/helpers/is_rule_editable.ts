/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { RuleType, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';

interface Props {
  capabilities: RecursiveReadonly<Capabilities>;
  rule: Rule | undefined;
  ruleType: RuleType<string, string> | undefined;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}

export function isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry }: Props) {
  const canExecuteActions = capabilities?.actions?.execute;

  const hasAllPrivilege = (rule && ruleType?.authorizedConsumers[rule.consumer]?.all) ?? false;

  const canSaveRule =
    rule &&
    hasAllPrivilege &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));

  return Boolean(
    // can the user save the rule
    canSaveRule &&
      // is this rule type editable from within Rules Management
      (ruleTypeRegistry.has(rule.ruleTypeId)
        ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
        : false)
  );
}
