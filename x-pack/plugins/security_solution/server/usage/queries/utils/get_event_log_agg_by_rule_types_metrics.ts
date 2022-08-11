/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RuleTypeId } from '@kbn/securitysolution-rules';
import { getEventLogAggByRuleTypeMetrics } from './get_event_log_agg_by_rule_type_metrics';

export const getEventLogAggByRuleTypesMetrics = (
  ruleTypes: RuleTypeId[]
): Record<string, AggregationsAggregationContainer> => {
  return ruleTypes.reduce<Record<string, AggregationsAggregationContainer>>((accum, ruleType) => {
    accum[ruleType] = getEventLogAggByRuleTypeMetrics(ruleType);
    return accum;
  }, {});
};
