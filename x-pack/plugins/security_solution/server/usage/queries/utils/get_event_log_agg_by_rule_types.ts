/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RuleTypeId } from '@kbn/securitysolution-rules';
import type { RuleStatus } from '../../types';
import { getEventLogAggByRuleType } from './get_event_log_agg_by_rule_type';

export interface GetEventLogAggByRuleTypesOptions {
  ruleTypes: RuleTypeId[];
  ruleStatus: RuleStatus;
}

/**
 * Given an array of rule types such as "siem.eqlRule" | "siem.mlRule", etc.. and
 * a rule status such as "succeeded" | "partial failure" | "failed", this will return
 * aggregations for querying and categorizing them.
 * @param ruleType The rule type such as "siem.eqlRule" | "siem.mlRule" etc...
 * @param ruleStatus The rule status such as "succeeded" | "partial failure" | "failed"
 * @returns The aggregation by rule types
 */
export const getEventLogAggByRuleTypes = ({
  ruleTypes,
  ruleStatus,
}: GetEventLogAggByRuleTypesOptions): Record<string, AggregationsAggregationContainer> => {
  return ruleTypes.reduce<Record<string, AggregationsAggregationContainer>>((accum, ruleType) => {
    accum[ruleType] = getEventLogAggByRuleType({ ruleType, ruleStatus });
    return accum;
  }, {});
};
