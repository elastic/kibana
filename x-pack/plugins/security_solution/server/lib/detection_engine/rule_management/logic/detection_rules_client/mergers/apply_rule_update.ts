/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleResponse,
  RuleUpdateProps,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { applyRuleDefaults } from './apply_rule_defaults';

interface ApplyRuleUpdateProps {
  existingRule: RuleResponse;
  ruleUpdate: RuleUpdateProps;
}

export const applyRuleUpdate = async ({
  existingRule,
  ruleUpdate,
}: ApplyRuleUpdateProps): Promise<RuleResponse> => {
  const nextRule: RuleResponse = {
    ...applyRuleDefaults(ruleUpdate),

    // Use existing values
    enabled: ruleUpdate.enabled ?? existingRule.enabled,
    version: ruleUpdate.version ?? existingRule.version,

    // Always keep existing values for these fields
    id: existingRule.id,
    rule_id: existingRule.rule_id,
    revision: existingRule.revision,
    immutable: existingRule.immutable,
    rule_source: existingRule.rule_source,
    updated_at: existingRule.updated_at,
    updated_by: existingRule.updated_by,
    created_at: existingRule.created_at,
    created_by: existingRule.created_by,
  };

  return nextRule;
};
