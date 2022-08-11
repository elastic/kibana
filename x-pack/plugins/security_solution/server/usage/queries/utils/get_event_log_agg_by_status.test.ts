/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEventLogAggByStatus } from './get_event_log_agg_by_status';

describe('get_event_log_agg_by_status', () => {
  test('returns empty aggregation if ruleTypes is an empty array', () => {
    const result = getEventLogAggByStatus({ ruleStatus: 'succeeded', ruleTypes: [] });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'succeeded',
        },
      },
      aggs: {},
    });
  });

  test('returns 1 aggregation if ruleTypes has 1 element', () => {
    const result = getEventLogAggByStatus({ ruleStatus: 'succeeded', ruleTypes: ['siem.eqlRule'] });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'succeeded',
        },
      },
      aggs: {
        'siem.eqlRule': {
          filter: {
            term: {
              'rule.category': 'siem.eqlRule',
            },
          },
          aggs: {
            cardinality: {
              cardinality: {
                field: 'rule.id',
              },
            },
          },
        },
      },
    });
  });

  test('returns 1 aggregation merged if ruleTypes has same element twice', () => {
    const result = getEventLogAggByStatus({
      ruleStatus: 'succeeded',
      ruleTypes: ['siem.eqlRule', 'siem.eqlRule'],
    });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'succeeded',
        },
      },
      aggs: {
        'siem.eqlRule': {
          filter: {
            term: {
              'rule.category': 'siem.eqlRule',
            },
          },
          aggs: {
            cardinality: {
              cardinality: {
                field: 'rule.id',
              },
            },
          },
        },
      },
    });
  });

  test('returns 2 aggregations if ruleTypes has 2 different elements', () => {
    const result = getEventLogAggByStatus({
      ruleStatus: 'succeeded',
      ruleTypes: ['siem.eqlRule', 'siem.indicatorRule'],
    });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'succeeded',
        },
      },
      aggs: {
        'siem.eqlRule': {
          filter: {
            term: {
              'rule.category': 'siem.eqlRule',
            },
          },
          aggs: {
            cardinality: {
              cardinality: {
                field: 'rule.id',
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
            cardinality: {
              cardinality: {
                field: 'rule.id',
              },
            },
          },
        },
      },
    });
  });

  test('returns 2 aggregations if ruleTypes has 2 different elements with "categorization" if ruleStatus is "failed', () => {
    const result = getEventLogAggByStatus({
      ruleStatus: 'failed',
      ruleTypes: ['siem.eqlRule', 'siem.indicatorRule'],
    });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'failed',
        },
      },
      aggs: {
        'siem.eqlRule': {
          filter: {
            term: {
              'rule.category': 'siem.eqlRule',
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
        },
        'siem.indicatorRule': {
          filter: {
            term: {
              'rule.category': 'siem.indicatorRule',
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
        },
      },
    });
  });

  test('returns 2 aggregations if ruleTypes has 2 different elements with "categorization" if ruleStatus is "partial failure', () => {
    const result = getEventLogAggByStatus({
      ruleStatus: 'partial failure',
      ruleTypes: ['siem.eqlRule', 'siem.indicatorRule'],
    });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'partial failure',
        },
      },
      aggs: {
        'siem.eqlRule': {
          filter: {
            term: {
              'rule.category': 'siem.eqlRule',
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
        },
        'siem.indicatorRule': {
          filter: {
            term: {
              'rule.category': 'siem.indicatorRule',
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
        },
      },
    });
  });

  test('returns 7 aggregations if ruleTypes has 7 different elements with "categorization" if ruleStatus is "failed', () => {
    const result = getEventLogAggByStatus({
      ruleStatus: 'partial failure',
      ruleTypes: [
        'siem.eqlRule',
        'siem.indicatorRule',
        'siem.thresholdRule',
        'siem.indicatorRule',
        'siem.mlRule',
        'siem.queryRule',
        'siem.savedQueryRule',
      ],
    });
    expect(result).toEqual<AggregationsAggregationContainer>({
      filter: {
        term: {
          'kibana.alert.rule.execution.status': 'partial failure',
        },
      },
      aggs: {
        'siem.eqlRule': {
          filter: {
            term: {
              'rule.category': 'siem.eqlRule',
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
        },
        'siem.indicatorRule': {
          filter: {
            term: {
              'rule.category': 'siem.indicatorRule',
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
        },
        'siem.thresholdRule': {
          filter: {
            term: {
              'rule.category': 'siem.thresholdRule',
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
        },
        'siem.mlRule': {
          filter: {
            term: {
              'rule.category': 'siem.mlRule',
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
        },
        'siem.queryRule': {
          filter: {
            term: {
              'rule.category': 'siem.queryRule',
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
        },
        'siem.savedQueryRule': {
          filter: {
            term: {
              'rule.category': 'siem.savedQueryRule',
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
        },
      },
    });
  });
});
