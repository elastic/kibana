/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RuleTypeId } from '@kbn/securitysolution-rules';
import type { RuleStatus } from '../../types';

export interface GetEventLogAggByRuleTypeOptions {
  ruleType: RuleTypeId;
  ruleStatus: RuleStatus;
}

/**
 * Given a rule type and rule status this will return an aggregation filter and a
 * sub aggregation of categories and count how many rule id's are associated. If the
 * rule status is "failed" or "partial failure" you get the added aggregation of a
 * categorize text added. This categorize text will give you the top 10 failures based
 * on the message field.
 * @param ruleType The rule type such as "siem.eqlRule" | "siem.mlRule" etc...
 * @param ruleStatus The rule status such as "succeeded" | "partial failure" | "failed"
 * @returns The aggregation to put into a search
 */
export const getEventLogAggByRuleType = ({
  ruleType,
  ruleStatus,
}: GetEventLogAggByRuleTypeOptions): AggregationsAggregationContainer => {
  if (ruleStatus === 'failed' || ruleStatus === 'partial failure') {
    return {
      filter: {
        term: {
          'rule.category': ruleType,
        },
      },
      aggs: {
        categories: {
          categorize_text: {
            size: 10,
            field: 'message',
          },
        },
        cardinality: {
          cardinality: {
            field: 'rule.id',
          },
        },
      },
    };
  } else {
    return {
      filter: {
        term: {
          'rule.category': ruleType,
        },
      },
      aggs: {
        cardinality: {
          cardinality: {
            field: 'rule.id',
          },
        },
      },
    };
  }
};
