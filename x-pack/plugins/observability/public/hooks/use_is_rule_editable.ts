/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isRuleEditable, IsRuleEditableProps } from '../pages/rule_details/helpers/utils';

export function useIsRuleEditable({
  capabilities,
  rule,
  ruleType,
  ruleTypeRegistry,
}: IsRuleEditableProps): boolean {
  return useMemo(
    () => isRuleEditable({ capabilities, rule, ruleType, ruleTypeRegistry }),
    [capabilities, rule, ruleType, ruleTypeRegistry]
  );
}
