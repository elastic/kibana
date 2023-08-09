/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  AggregatedMetric,
  NumberOfDetectedGaps,
  NumberOfExecutions,
  NumberOfLoggedMessages,
  RuleExecutionStats,
  TopMessages,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  RuleExecutionEventType,
  RuleExecutionStatus,
  LogLevel,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';

import { DEFAULT_PERCENTILES } from '../../../utils/es_aggregations';
import type { RawData } from '../../../utils/normalization';
import * as f from '../../../event_log/event_log_fields';

export type RuleExecutionStatsAggregationLevel = 'whole-interval' | 'histogram';

export const getRuleExecutionStatsAggregation = (
  aggregationContext: RuleExecutionStatsAggregationLevel
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    totalExecutions: {
      cardinality: {
        field: f.RULE_EXECUTION_UUID,
      },
    },
    executeEvents: {
      filter: {
        term: { [f.EVENT_ACTION]: 'execute' },
      },
      aggs: {
        executionDurationMs: {
          percentiles: {
            field: f.RULE_EXECUTION_TOTAL_DURATION_MS,
            missing: 0,
            percents: DEFAULT_PERCENTILES,
          },
        },
        scheduleDelayNs: {
          percentiles: {
            field: f.RULE_EXECUTION_SCHEDULE_DELAY_NS,
            missing: 0,
            percents: DEFAULT_PERCENTILES,
          },
        },
      },
    },
    statusChangeEvents: {
      filter: {
        bool: {
          filter: [
            {
              term: {
                [f.EVENT_ACTION]: RuleExecutionEventType['status-change'],
              },
            },
          ],
          must_not: [
            {
              terms: {
                [f.RULE_EXECUTION_STATUS]: [
                  RuleExecutionStatus.running,
                  RuleExecutionStatus['going to run'],
                ],
              },
            },
          ],
        },
      },
      aggs: {
        executionsByStatus: {
          terms: {
            field: f.RULE_EXECUTION_STATUS,
          },
        },
      },
    },
    executionMetricsEvents: {
      filter: {
        term: { [f.EVENT_ACTION]: RuleExecutionEventType['execution-metrics'] },
      },
      aggs: {
        gaps: {
          filter: {
            exists: {
              field: f.RULE_EXECUTION_GAP_DURATION_S,
            },
          },
          aggs: {
            totalGapDurationS: {
              sum: {
                field: f.RULE_EXECUTION_GAP_DURATION_S,
              },
            },
          },
        },
        searchDurationMs: {
          percentiles: {
            field: f.RULE_EXECUTION_SEARCH_DURATION_MS,
            missing: 0,
            percents: DEFAULT_PERCENTILES,
          },
        },
        indexingDurationMs: {
          percentiles: {
            field: f.RULE_EXECUTION_INDEXING_DURATION_MS,
            missing: 0,
            percents: DEFAULT_PERCENTILES,
          },
        },
      },
    },
    messageContainingEvents: {
      filter: {
        terms: {
          [f.EVENT_ACTION]: [
            RuleExecutionEventType['status-change'],
            RuleExecutionEventType.message,
          ],
        },
      },
      aggs: {
        messagesByLogLevel: {
          terms: {
            field: f.LOG_LEVEL,
          },
        },
        ...(aggregationContext === 'whole-interval'
          ? {
              errors: {
                filter: {
                  term: { [f.LOG_LEVEL]: LogLevel.error },
                },
                aggs: {
                  topErrors: {
                    categorize_text: {
                      field: 'message',
                      size: 5,
                      similarity_threshold: 99,
                    },
                  },
                },
              },
              warnings: {
                filter: {
                  term: { [f.LOG_LEVEL]: LogLevel.warn },
                },
                aggs: {
                  topWarnings: {
                    categorize_text: {
                      field: 'message',
                      size: 5,
                      similarity_threshold: 99,
                    },
                  },
                },
              },
            }
          : {}),
      },
    },
  };
};

export const normalizeRuleExecutionStatsAggregationResult = (
  aggregations: Record<string, RawData>,
  aggregationLevel: RuleExecutionStatsAggregationLevel
): RuleExecutionStats => {
  const totalExecutions = aggregations.totalExecutions || {};
  const executeEvents = aggregations.executeEvents || {};
  const statusChangeEvents = aggregations.statusChangeEvents || {};
  const executionMetricsEvents = aggregations.executionMetricsEvents || {};
  const messageContainingEvents = aggregations.messageContainingEvents || {};

  const executionDurationMs = executeEvents.executionDurationMs || {};
  const scheduleDelayNs = executeEvents.scheduleDelayNs || {};
  const executionsByStatus = statusChangeEvents.executionsByStatus || {};
  const gaps = executionMetricsEvents.gaps || {};
  const searchDurationMs = executionMetricsEvents.searchDurationMs || {};
  const indexingDurationMs = executionMetricsEvents.indexingDurationMs || {};

  return {
    number_of_executions: normalizeNumberOfExecutions(totalExecutions, executionsByStatus),
    number_of_logged_messages: normalizeNumberOfLoggedMessages(messageContainingEvents),
    number_of_detected_gaps: normalizeNumberOfDetectedGaps(gaps),
    schedule_delay_ms: normalizeAggregatedMetric(scheduleDelayNs, (val) => val / 1_000_000),
    execution_duration_ms: normalizeAggregatedMetric(executionDurationMs),
    search_duration_ms: normalizeAggregatedMetric(searchDurationMs),
    indexing_duration_ms: normalizeAggregatedMetric(indexingDurationMs),
    top_errors:
      aggregationLevel === 'whole-interval'
        ? normalizeTopErrors(messageContainingEvents)
        : undefined,
    top_warnings:
      aggregationLevel === 'whole-interval'
        ? normalizeTopWarnings(messageContainingEvents)
        : undefined,
  };
};

const normalizeNumberOfExecutions = (
  totalExecutions: RawData,
  executionsByStatus: RawData
): NumberOfExecutions => {
  const getStatusCount = (status: RuleExecutionStatus): number => {
    const bucket = executionsByStatus.buckets.find((b: RawData) => b.key === status);
    return Number(bucket?.doc_count || 0);
  };

  return {
    total: Number(totalExecutions.value || 0),
    by_outcome: {
      succeeded: getStatusCount(RuleExecutionStatus.succeeded),
      warning: getStatusCount(RuleExecutionStatus['partial failure']),
      failed: getStatusCount(RuleExecutionStatus.failed),
    },
  };
};

const normalizeNumberOfLoggedMessages = (
  messageContainingEvents: RawData
): NumberOfLoggedMessages => {
  const messagesByLogLevel = messageContainingEvents.messagesByLogLevel || {};

  const getMessageCount = (level: LogLevel): number => {
    const bucket = messagesByLogLevel.buckets.find((b: RawData) => b.key === level);
    return Number(bucket?.doc_count || 0);
  };

  return {
    total: Number(messageContainingEvents.doc_count || 0),
    by_level: {
      error: getMessageCount(LogLevel.error),
      warn: getMessageCount(LogLevel.warn),
      info: getMessageCount(LogLevel.info),
      debug: getMessageCount(LogLevel.debug),
      trace: getMessageCount(LogLevel.trace),
    },
  };
};

const normalizeNumberOfDetectedGaps = (gaps: RawData): NumberOfDetectedGaps => {
  return {
    total: Number(gaps.doc_count || 0),
    total_duration_s: Number(gaps.totalGapDurationS?.value || 0),
  };
};

const normalizeAggregatedMetric = (
  percentilesAggregate: RawData,
  modifier: (value: number) => number = (v) => v
): AggregatedMetric<number> => {
  const rawPercentiles = percentilesAggregate.values || {};
  return {
    percentiles: mapValues(rawPercentiles, (rawValue) => modifier(Number(rawValue || 0))),
  };
};

const normalizeTopErrors = (messageContainingEvents: RawData): TopMessages => {
  const topErrors = messageContainingEvents.errors?.topErrors || {};
  return normalizeTopMessages(topErrors);
};

const normalizeTopWarnings = (messageContainingEvents: RawData): TopMessages => {
  const topWarnings = messageContainingEvents.warnings?.topWarnings || {};
  return normalizeTopMessages(topWarnings);
};

const normalizeTopMessages = (categorizeTextAggregate: RawData): TopMessages => {
  const buckets = (categorizeTextAggregate || {}).buckets || [];
  return buckets.map((b: RawData) => {
    return {
      count: Number(b?.doc_count || 0),
      message: String(b?.key || ''),
    };
  });
};
