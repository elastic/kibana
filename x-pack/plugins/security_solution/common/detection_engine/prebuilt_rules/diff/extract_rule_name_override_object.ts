/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../api/detection_engine/model/rule_schema';
import type { RuleNameOverrideObject } from '../../../api/detection_engine/prebuilt_rules';

export const extractRuleNameOverrideObject = (
  rule: RuleResponse
): RuleNameOverrideObject | undefined => {
  if (rule.rule_name_override == null) {
    return undefined;
  }
  return {
    field_name: rule.rule_name_override,
  };
};
