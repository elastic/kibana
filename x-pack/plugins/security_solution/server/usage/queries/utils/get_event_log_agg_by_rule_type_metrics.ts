/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeId } from '@kbn/securitysolution-rules';

/**
 * Given a rule type this will return aggregations based on metrics such as "gapCount" and it
 * will filter on the rule.category given the rule type to get the metrics based on the rule type
 * @param ruleType The rule type such as "siem.eqlRule" | "siem.mlRule" etc...
 * @returns The aggregation to put into a search
 */
export const getEventLogAggByRuleTypeMetrics = (ruleType: RuleTypeId) => {
  return {
    filter: {
      term: {
        'rule.category': ruleType,
      },
    },
    aggs: {
      gapCount: {
        cardinality: {
          field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
        },
      },
      maxGapDuration: {
        max: {
          field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
        },
      },
      minGapDuration: {
        min: {
          field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
        },
      },
      avgGapDuration: {
        avg: {
          field: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
        },
      },
      maxTotalIndexDuration: {
        max: {
          field: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
        },
      },
      minTotalIndexDuration: {
        min: {
          field: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
        },
      },
      avgTotalIndexDuration: {
        avg: {
          field: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
        },
      },
      maxTotalSearchDuration: {
        max: {
          field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
        },
      },
      minTotalSearchDuration: {
        min: {
          field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
        },
      },
      avgTotalSearchDuration: {
        avg: {
          field: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
        },
      },
    },
  };
};
