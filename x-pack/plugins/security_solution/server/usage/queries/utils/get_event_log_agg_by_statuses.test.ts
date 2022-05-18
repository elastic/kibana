/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEventLogAggByStatuses } from './get_event_log_agg_by_statuses';

describe('get_event_log_agg_by_statuses', () => {
  test('returns empty aggregations with empty array', () => {
    const result = getEventLogAggByStatuses({ ruleStatuses: [], ruleTypes: [] });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      eventActionStatusChange: {
        filter: {
          term: {
            'event.action': 'status-change',
          },
        },
        aggs: {},
      },
      eventActionExecutionMetrics: {
        filter: {
          term: {
            'event.action': 'execution-metrics',
          },
        },
        aggs: {},
      },
    });
  });

  test('returns partial empty aggregations when ruleStatuses has a value', () => {
    const result = getEventLogAggByStatuses({ ruleStatuses: ['failed'], ruleTypes: [] });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      eventActionStatusChange: {
        filter: {
          term: {
            'event.action': 'status-change',
          },
        },
        aggs: {
          failed: {
            filter: {
              term: {
                'kibana.alert.rule.execution.status': 'failed',
              },
            },
            aggs: {},
          },
        },
      },
      eventActionExecutionMetrics: {
        filter: {
          term: {
            'event.action': 'execution-metrics',
          },
        },
        aggs: {},
      },
    });
  });

  test('returns partial empty aggregations when ruleTypes has a value', () => {
    const result = getEventLogAggByStatuses({ ruleStatuses: [], ruleTypes: ['siem.eqlRule'] });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      eventActionStatusChange: {
        filter: {
          term: {
            'event.action': 'status-change',
          },
        },
        aggs: {},
      },
      eventActionExecutionMetrics: {
        filter: {
          term: {
            'event.action': 'execution-metrics',
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
        },
      },
    });
  });

  test('returns single aggregation when both ruleStatuses and ruleTypes has a single value', () => {
    const result = getEventLogAggByStatuses({
      ruleStatuses: ['succeeded'],
      ruleTypes: ['siem.eqlRule'],
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      eventActionStatusChange: {
        filter: {
          term: {
            'event.action': 'status-change',
          },
        },
        aggs: {
          succeeded: {
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
          },
        },
      },
      eventActionExecutionMetrics: {
        filter: {
          term: {
            'event.action': 'execution-metrics',
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
        },
      },
    });
  });

  test('returns aggregations when both ruleStatuses and ruleTypes both have multiple values', () => {
    const result = getEventLogAggByStatuses({
      ruleStatuses: ['succeeded', 'failed'],
      ruleTypes: ['siem.eqlRule', 'siem.thresholdRule'],
    });
    expect(result).toEqual<Record<string, AggregationsAggregationContainer>>({
      eventActionStatusChange: {
        filter: {
          term: {
            'event.action': 'status-change',
          },
        },
        aggs: {
          succeeded: {
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
              'siem.thresholdRule': {
                filter: {
                  term: {
                    'rule.category': 'siem.thresholdRule',
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
          },
          failed: {
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
            },
          },
        },
      },
      eventActionExecutionMetrics: {
        filter: {
          term: {
            'event.action': 'execution-metrics',
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
          'siem.thresholdRule': {
            filter: {
              term: {
                'rule.category': 'siem.thresholdRule',
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
        },
      },
    });
  });
});
