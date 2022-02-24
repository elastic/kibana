/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesTypeUsage, RuleMetric } from './types';
import { updateQueryUsage } from './usage_utils/update_query_usage';
import { updateTotalUsage } from './usage_utils/update_total_usage';

export const updateRuleUsage = (
  detectionRuleMetric: RuleMetric,
  usage: RulesTypeUsage
): RulesTypeUsage => {
  let updatedUsage = usage;
  if (detectionRuleMetric.rule_type === 'query') {
    updatedUsage = {
      ...usage,
      query: updateQueryUsage({
        ruleType: detectionRuleMetric.rule_type,
        usage,
        detectionRuleMetric,
      }),
    };
  } else if (detectionRuleMetric.rule_type === 'threshold') {
    updatedUsage = {
      ...usage,
      threshold: updateQueryUsage({
        ruleType: detectionRuleMetric.rule_type,
        usage,
        detectionRuleMetric,
      }),
    };
  } else if (detectionRuleMetric.rule_type === 'eql') {
    updatedUsage = {
      ...usage,
      eql: updateQueryUsage({
        ruleType: detectionRuleMetric.rule_type,
        usage,
        detectionRuleMetric,
      }),
    };
  } else if (detectionRuleMetric.rule_type === 'machine_learning') {
    updatedUsage = {
      ...usage,
      machine_learning: updateQueryUsage({
        ruleType: detectionRuleMetric.rule_type,
        usage,
        detectionRuleMetric,
      }),
    };
  } else if (detectionRuleMetric.rule_type === 'threat_match') {
    updatedUsage = {
      ...usage,
      threat_match: updateQueryUsage({
        ruleType: detectionRuleMetric.rule_type,
        usage,
        detectionRuleMetric,
      }),
    };
  }

  if (detectionRuleMetric.elastic_rule) {
    updatedUsage = {
      ...updatedUsage,
      elastic_total: updateTotalUsage({
        detectionRuleMetric,
        updatedUsage,
        totalType: 'elastic_total',
      }),
    };
  } else {
    updatedUsage = {
      ...updatedUsage,
      custom_total: updateTotalUsage({
        detectionRuleMetric,
        updatedUsage,
        totalType: 'custom_total',
      }),
    };
  }

  return updatedUsage;
};
