/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingUsage } from '../types';

export function groupRulesBySearchType(
  rulesByNotifyWhen: Record<string, number>
): AlertingUsage['count_rules_by_search_type'] {
  return {
    es_query: rulesByNotifyWhen.esQuery ?? 0,
    search_source: rulesByNotifyWhen.searchSource ?? 0,
    esql_query: rulesByNotifyWhen.esqlQuery ?? 0,
  };
}
