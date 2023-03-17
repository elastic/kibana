/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Rule, RuleType } from '@kbn/triggers-actions-ui-plugin/public';

export function hasAllPrivilege(rule: Rule, ruleType?: RuleType): boolean {
  return ruleType?.authorizedConsumers[rule.consumer]?.all ?? false;
}
