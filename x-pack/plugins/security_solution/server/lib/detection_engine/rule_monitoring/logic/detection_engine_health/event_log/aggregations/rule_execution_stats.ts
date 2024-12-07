/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { mapValues } from 'lodash';

import type {
  AggregatedMetric,
  RuleHealthOverviewStats,
  LogLevel,
  NumberOfDetectedGaps,
  NumberOfExecutions,
  NumberOfLoggedMessages,
  RuleExecutionStatus,
  RuleInfo,
  RuleInfoWithPercentiles,
  TopMessages,
  TopRulesByMetrics,
  SpaceHealthOverviewStats,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  LogLevelEnum,
  RuleExecutionEventTypeEnum,
  RuleExecutionStatusEnum,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';

import {
  ALERTING_PROVIDER,
  RULE_EXECUTION_LOG_PROVIDER,
} from '../../../event_log/event_log_constants';
import * as f from '../../../event_log/event_log_fields';
import { DEFAULT_BASE_RULE_FIELDS, DEFAULT_PERCENTILES } from '../../../utils/es_aggregations';
import type { RawData } from '../../../utils/normalization';

export type RuleExecutionStatsAggregationLevel = 'whole-interval' | 'histogram';

export const getRuleExecutionStatsAggregation = (
  aggregationLevel: RuleExecutionStatsAggregationLevel
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    executeEvents: {
      filter: {
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: ALERTING_PROVIDER } },
            { term: { [f.EVENT_ACTION]: 'execute' } },
            { term: { [f.EVENT_CATEGORY]: 'siem' } },
          ],
        },
      },
      aggs: {
        totalExecutions: {
          cardinality: {
            field: f.RULE_EXECUTION_UUID,
          },
        },
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
            { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
            { term: { [f.EVENT_ACTION]: RuleExecutionEventTypeEnum['status-change'] } },
          ],
          must_not: [
            {
              terms: {
                [f.RULE_EXECUTION_STATUS]: [
                  RuleExecutionStatusEnum.running,
                  RuleExecutionStatusEnum['going to run'],
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
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
            { term: { [f.EVENT_ACTION]: RuleExecutionEventTypeEnum['execution-metrics'] } },
          ],
        },
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
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
            {
              terms: {
                [f.EVENT_ACTION]: [
                  RuleExecutionEventTypeEnum['status-change'],
                  RuleExecutionEventTypeEnum.message,
                ],
              },
            },
          ],
        },
      },
      aggs: {
        messagesByLogLevel: {
          terms: {
            field: f.LOG_LEVEL,
          },
        },
        ...(aggregationLevel === 'whole-interval'
          ? {
              errors: {
                filter: {
                  term: { [f.LOG_LEVEL]: LogLevelEnum.error },
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
                  term: { [f.LOG_LEVEL]: LogLevelEnum.warn },
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

export const getTopRulesByMetricsAggregation = (
  numOfTopRules: number
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    topRulesByExecutionDurationMs: {
      filter: {
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: ALERTING_PROVIDER } },
            { term: { [f.EVENT_ACTION]: 'execute' } },
            { term: { [f.EVENT_CATEGORY]: 'siem' } },
          ],
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'rule.id',
            size: numOfTopRules,
            order: { [`percentiles.${DEFAULT_PERCENTILES[1]}`]: 'desc' },
          },
          aggs: {
            percentiles: {
              percentiles: {
                field: f.RULE_EXECUTION_TOTAL_DURATION_MS,
                missing: 0,
                percents: DEFAULT_PERCENTILES,
              },
            },
            rule: {
              top_hits: {
                size: 1,
                _source: DEFAULT_BASE_RULE_FIELDS,
              },
            },
          },
        },
      },
    },
    topRulesByScheduleDelay: {
      filter: {
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: ALERTING_PROVIDER } },
            { term: { [f.EVENT_ACTION]: 'execute' } },
            { term: { [f.EVENT_CATEGORY]: 'siem' } },
          ],
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'rule.id',
            size: numOfTopRules,
            order: { [`percentiles.${DEFAULT_PERCENTILES[1]}`]: 'desc' },
          },
          aggs: {
            percentiles: {
              percentiles: {
                field: f.RULE_EXECUTION_SCHEDULE_DELAY_NS,
                missing: 0,
                percents: DEFAULT_PERCENTILES,
              },
            },
            rule: {
              top_hits: {
                size: 1,
                _source: DEFAULT_BASE_RULE_FIELDS,
              },
            },
          },
        },
      },
    },
    topRulesBySearchDurationMs: {
      filter: {
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
            { term: { [f.EVENT_ACTION]: RuleExecutionEventTypeEnum['execution-metrics'] } },
          ],
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'rule.id',
            size: numOfTopRules,
            order: { [`percentiles.${DEFAULT_PERCENTILES[1]}`]: 'desc' },
          },
          aggs: {
            percentiles: {
              percentiles: {
                field: f.RULE_EXECUTION_SEARCH_DURATION_MS,
                missing: 0,
                percents: DEFAULT_PERCENTILES,
              },
            },
            rule: {
              top_hits: {
                size: 1,
                _source: DEFAULT_BASE_RULE_FIELDS,
              },
            },
          },
        },
      },
    },
    topRulesByIndexingDurationMs: {
      filter: {
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
            { term: { [f.EVENT_ACTION]: RuleExecutionEventTypeEnum['execution-metrics'] } },
          ],
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'rule.id',
            size: numOfTopRules,
            order: { [`percentiles.${DEFAULT_PERCENTILES[1]}`]: 'desc' },
          },
          aggs: {
            percentiles: {
              percentiles: {
                field: f.RULE_EXECUTION_INDEXING_DURATION_MS,
                missing: 0,
                percents: DEFAULT_PERCENTILES,
              },
            },
            rule: {
              top_hits: {
                size: 1,
                _source: DEFAULT_BASE_RULE_FIELDS,
              },
            },
          },
        },
      },
    },
    topRulesByEnrichmentDurationMs: {
      filter: {
        bool: {
          filter: [
            { term: { [f.EVENT_PROVIDER]: RULE_EXECUTION_LOG_PROVIDER } },
            { term: { [f.EVENT_ACTION]: RuleExecutionEventTypeEnum['execution-metrics'] } },
          ],
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'rule.id',
            size: numOfTopRules,
            order: { [`percentiles.${DEFAULT_PERCENTILES[1]}`]: 'desc' },
          },
          aggs: {
            percentiles: {
              percentiles: {
                field: f.RULE_EXECUTION_TOTAL_ENRICHMENT_DURATION_MS,
                missing: 0,
                percents: DEFAULT_PERCENTILES,
              },
            },
            rule: {
              top_hits: {
                size: 1,
                _source: DEFAULT_BASE_RULE_FIELDS,
              },
            },
          },
        },
      },
    },
  };
};

export const normalizeSpaceExecutionStatsAggregationResult = (
  aggregations: Record<string, RawData>,
  aggregationLevel: RuleExecutionStatsAggregationLevel
): SpaceHealthOverviewStats => {
  return {
    top_rules: normalizeTopRulesByMetricsAggregationResult(aggregations),
    ...normalizeRuleExecutionStatsAggregationResult(aggregations, aggregationLevel),
  };
};

export const normalizeRuleExecutionStatsAggregationResult = (
  aggregations: Record<string, RawData>,
  aggregationLevel: RuleExecutionStatsAggregationLevel
): RuleHealthOverviewStats => {
  const executeEvents = aggregations.executeEvents || {};
  const statusChangeEvents = aggregations.statusChangeEvents || {};
  const executionMetricsEvents = aggregations.executionMetricsEvents || {};
  const messageContainingEvents = aggregations.messageContainingEvents || {};

  const totalExecutions = executeEvents.totalExecutions || {};
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

const normalizeTopRulesByMetricsAggregationResult = (
  aggregations: Record<string, RawData>
): TopRulesByMetrics => {
  const topRulesByExecutionDurationMs = aggregations.topRulesByExecutionDurationMs || {};
  const topRulesByScheduleDelay = aggregations.topRulesByScheduleDelay || {};
  const topRulesBySearchDurationMs = aggregations.topRulesBySearchDurationMs || {};
  const topRulesByIndexingDurationMs = aggregations.topRulesByIndexingDurationMs || {};
  const topRulesByEnrichmentDurationMs = aggregations.topRulesByEnrichmentDurationMs || {};

  return {
    by_execution_duration_ms:
      normalizeTopRuleAggregationResult(topRulesByExecutionDurationMs) ?? [],
    by_schedule_delay_ms: normalizeTopRuleAggregationResult(topRulesByScheduleDelay) ?? [],
    by_search_duration_ms: normalizeTopRuleAggregationResult(topRulesBySearchDurationMs) ?? [],
    by_indexing_duration_ms: normalizeTopRuleAggregationResult(topRulesByIndexingDurationMs) ?? [],
    by_enrichment_duration_ms:
      normalizeTopRuleAggregationResult(topRulesByEnrichmentDurationMs) ?? [],
  };
};

const normalizeTopRuleAggregationResult = (
  topRules: RawData
): RuleInfoWithPercentiles[] | undefined => {
  if (!topRules?.rules?.buckets) {
    return undefined;
  }

  return topRules.rules.buckets.map((bucket: RawData) => ({
    ...normalizeRuleInfo(bucket.rule),
    ...normalizeAggregatedMetric(bucket.percentiles),
  }));
};

const normalizeRuleInfo = (ruleBucket: RawData): RuleInfo | undefined => {
  if (
    !ruleBucket?.hits?.hits?.[0]?._source?.rule ||
    typeof ruleBucket.hits.hits[0]._source.rule !== 'object'
  ) {
    return undefined;
  }

  const ruleData = ruleBucket.hits.hits[0]._source.rule;

  return {
    id: ruleData.id,
    name: ruleData.name,
    category: ruleData.category,
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
      succeeded: getStatusCount(RuleExecutionStatusEnum.succeeded),
      warning: getStatusCount(RuleExecutionStatusEnum['partial failure']),
      failed: getStatusCount(RuleExecutionStatusEnum.failed),
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
      error: getMessageCount(LogLevelEnum.error),
      warn: getMessageCount(LogLevelEnum.warn),
      info: getMessageCount(LogLevelEnum.info),
      debug: getMessageCount(LogLevelEnum.debug),
      trace: getMessageCount(LogLevelEnum.trace),
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
