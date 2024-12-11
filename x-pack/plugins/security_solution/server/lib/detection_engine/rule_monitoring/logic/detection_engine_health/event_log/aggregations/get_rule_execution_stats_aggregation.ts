/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
import { DEFAULT_PERCENTILES } from '../../../utils/es_aggregations';
import type { RuleExecutionStatsAggregationLevel } from '../aggregation_level';

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
