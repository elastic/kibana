/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleByIds } from './query_rule_by_ids';

/**
 * Additional validation that is implemented outside of the schema itself.
 */
export const validateQueryRuleByIds = (schema: QueryRuleByIds): string[] => {
  return [...validateId(schema)];
};

const validateId = (rule: QueryRuleByIds): string[] => {
  if (rule.id != null && rule.rule_id != null) {
    return ['both "id" and "rule_id" cannot exist, choose one or the other'];
  } else if (rule.id == null && rule.rule_id == null) {
    return ['either "id" or "rule_id" must be set'];
  } else {
    return [];
  }
};
