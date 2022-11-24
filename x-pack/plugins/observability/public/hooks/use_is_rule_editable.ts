/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import { Rule, RuleType, RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { RecursiveReadonly } from '@kbn/utility-types';

export interface UseIsRuleEditableProps {
  capabilities: RecursiveReadonly<Capabilities>;
  rule: Rule | undefined;
  ruleType: RuleType<string, string> | undefined;
  ruleTypeRegistry: TypeRegistry<RuleTypeModel<any>>;
}

export function useIsRuleEditable({
  capabilities,
  rule,
  ruleType,
  ruleTypeRegistry,
}: UseIsRuleEditableProps): boolean {
  if (!rule) {
    return false;
  }

  // If the authorized consumers object of the rule type does not contain the rule
  // being passed, the rule is not editable
  if (!ruleType?.authorizedConsumers[rule.consumer]?.all) {
    return false;
  }

  //  If there are no capabilities to execute actions and the rule has 1 or more
  // actions to perform, the rule is not editable.
  if (!capabilities.actions?.execute && rule.actions.length !== 0) {
    return false;
  }

  try {
    // If the rule has been registered in the ruleTypeRegistry and requiresAppContext
    // is set to false, it means the rule is editable.
    // Wrapped in try-catch as ruleTypeRegistry will throw an Error if the rule is not registered
    return ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext === false;
  } catch (e) {
    return false;
  }
}
