/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEventLogAggByRuleTypeMetrics } from './get_event_log_agg_by_rule_type_metrics';

describe('get_event_log_agg_by_rule_type_metrics', () => {
  test('returns expected aggregation when given a rule type', () => {
    const result = getEventLogAggByRuleTypeMetrics('siem.eqlRule');
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'rule.category': 'siem.eqlRule',
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
    });
  });
});
