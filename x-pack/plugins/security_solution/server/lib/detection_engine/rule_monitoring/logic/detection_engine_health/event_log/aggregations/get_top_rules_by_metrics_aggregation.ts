/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuleExecutionEventTypeEnum } from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  ALERTING_PROVIDER,
  RULE_EXECUTION_LOG_PROVIDER,
} from '../../../event_log/event_log_constants';
import * as f from '../../../event_log/event_log_fields';
import { DEFAULT_BASE_RULE_FIELDS, DEFAULT_PERCENTILES } from '../../../utils/es_aggregations';

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
