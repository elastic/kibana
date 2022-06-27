/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule, RuleType } from '@kbn/triggers-actions-ui-plugin/public';

export const DEFAULT_SEARCH_PAGE_SIZE: number = 25;

export const OBSERVABILITY_SOLUTIONS = ['logs', 'uptime', 'infrastructure', 'apm'];

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags' | 'notifyWhen'>;

export function hasAllPrivilege(rule: InitialRule, ruleType?: RuleType): boolean {
  return ruleType?.authorizedConsumers[rule.consumer]?.all ?? false;
}
