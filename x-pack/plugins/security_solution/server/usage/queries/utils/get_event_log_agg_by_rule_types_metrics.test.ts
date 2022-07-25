/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEventLogAggByRuleTypesMetrics } from './get_event_log_agg_by_rule_types_metrics';

describe('get_event_log_agg_by_rule_types_metrics', () => {
  test('returns empty object when given an empty array', () => {
    const result = getEventLogAggByRuleTypesMetrics([]);
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({});
  });

  test('returns expected aggregation when given a single ruleType ', () => {
    const result = getEventLogAggByRuleTypesMetrics(['siem.eqlRule']);
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
    });
  });

  test('returns same aggregation if the same string is repeated in the array', () => {
    const result = getEventLogAggByRuleTypesMetrics(['siem.eqlRule', 'siem.eqlRule']);
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
    });
  });

  test('returns 2 expected aggregations when given 2 ruleTypes ', () => {
    const result = getEventLogAggByRuleTypesMetrics(['siem.eqlRule', 'siem.indicatorRule']);
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      'siem.eqlRule': {
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
      },
      'siem.indicatorRule': {
        filter: {
          term: {
            'rule.category': 'siem.indicatorRule',
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
      },
    });
  });
});
