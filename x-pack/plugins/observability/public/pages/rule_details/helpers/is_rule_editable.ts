/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasAllPrivilege } from './has_all_privilege';

interface Props {
  capabilities: any;
  rule: any;
  ruleType: any;
  ruleTypeRegistry: any;
}

export function isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry }: Props) {
  const canExecuteActions = capabilities?.actions?.execute;

  const canSaveRule =
    rule &&
    hasAllPrivilege(rule, ruleType) &&
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
