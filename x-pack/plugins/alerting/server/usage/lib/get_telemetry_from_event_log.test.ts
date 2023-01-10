/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  getExecutionsPerDayCount,
  parseExecutionFailureByRuleType,
  parseRuleTypeBucket,
  parsePercentileAggs,
  parseExecutionCountAggregationResults,
  getExecutionTimeoutsPerDayCount,
  GetExecutionCountsAggregationBucket,
} from './get_telemetry_from_event_log';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();

interface GetAggResultsOpts {
  key?: string;
  doc_count?: number;
  avg_event_duration: number;
  avg_kibana_task_schedule_delay: number;
  avg_number_of_searches: number;
  avg_total_indexing_duration_ms: number;
  avg_es_search_duration_ms: number;
  avg_total_search_duration_ms: number;
  avg_execution_gap_duration_s: number;
  avg_rule_type_run_duration_ms: number;
  avg_process_alerts_duration_ms: number;
  avg_trigger_actions_duration_ms: number;
  avg_process_rule_duration_ms: number;
  avg_claim_to_start_duration_ms: number;
  avg_prepare_rule_duration_ms: number;
  avg_total_run_duration_ms: number;
  avg_total_enrichment_duration_ms: number;
  percentile_number_of_triggered_actions: {
    p50: number;
    p90: number;
    p99: number;
  };
  percentile_number_of_generated_actions: {
    p50: number;
    p90: number;
    p99: number;
  };
  percentile_alert_counts_active: {
    p50: number;
    p90: number;
    p99: number;
  };
  percentile_alert_counts_new: {
    p50: number;
    p90: number;
    p99: number;
  };
  percentile_alert_counts_recovered: {
    p50: number;
    p90: number;
    p99: number;
  };
  execution_failures: {
    doc_count: number;
    by_reason: {
      doc_count_error_upper_bound: number;
      sum_other_doc_count: number;
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}
const getAggResult = (params: GetAggResultsOpts): GetExecutionCountsAggregationBucket => {
  return {
    ...Object.keys(params).reduce((acc, key) => {
      if (key.startsWith('percentile')) {
        return {
          ...acc,
          [key]: {
            values: {
              '50.0': get(params, `${key}.p50`),
              '90.0': get(params, `${key}.p90`),
              '99.0': get(params, `${key}.p99`),
            },
          },
        };
      } else if (key.startsWith('avg')) {
        return {
          ...acc,
          [key]: {
            value: get(params, key),
          },
        };
      } else {
        return {
          ...acc,
          [key]: get(params, key),
        };
      }
    }, {}),
  } as GetExecutionCountsAggregationBucket;
};

const indexThresholdAggResult = getAggResult({
  key: '.index-threshold',
  doc_count: 78,
  avg_event_duration: 100576923.07692307,
  avg_kibana_task_schedule_delay: 1541564.2432,
  avg_number_of_searches: 1.2,
  avg_total_indexing_duration_ms: 33.2468545465,
  avg_es_search_duration_ms: 40.76056338028169,
  avg_total_search_duration_ms: 43.74647887323944,
  avg_execution_gap_duration_s: 3.4564534,
  avg_rule_type_run_duration_ms: 6.454324687,
  avg_process_alerts_duration_ms: 11.48654234,
  avg_trigger_actions_duration_ms: 5.15646487,
  avg_process_rule_duration_ms: 14.8743546857,
  avg_claim_to_start_duration_ms: 55.5645324168,
  avg_prepare_rule_duration_ms: 6.567687,
  avg_total_run_duration_ms: 101.46745347,
  avg_total_enrichment_duration_ms: 47.5757,
  percentile_number_of_triggered_actions: {
    p50: 1,
    p90: 1,
    p99: 1,
  },
  percentile_number_of_generated_actions: {
    p50: 1,
    p90: 1,
    p99: 1,
  },
  percentile_alert_counts_active: {
    p50: 1,
    p90: 1,
    p99: 1,
  },
  percentile_alert_counts_new: {
    p50: 1,
    p90: 1,
    p99: 1,
  },
  percentile_alert_counts_recovered: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  execution_failures: {
    doc_count: 7,
    by_reason: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'execute',
          doc_count: 4,
        },
        {
          key: 'decrypt',
          doc_count: 3,
        },
      ],
    },
  },
});
const documentTestAggResult = getAggResult({
  key: 'document.test.',
  doc_count: 42,
  avg_event_duration: 770071428.5714285,
  avg_kibana_task_schedule_delay: 4542467.24547,
  avg_number_of_searches: 0,
  avg_total_indexing_duration_ms: 11.456767,
  avg_es_search_duration_ms: 0,
  avg_total_search_duration_ms: 0,
  avg_execution_gap_duration_s: 1.5767537,
  avg_rule_type_run_duration_ms: 4.4657357,
  avg_process_alerts_duration_ms: 3.243575,
  avg_trigger_actions_duration_ms: 8.1357657,
  avg_process_rule_duration_ms: 19.527435745,
  avg_claim_to_start_duration_ms: 1.437537,
  avg_prepare_rule_duration_ms: 9.57357,
  avg_total_run_duration_ms: 77.5275347687,
  avg_total_enrichment_duration_ms: 0,
  percentile_number_of_triggered_actions: {
    p50: 5,
    p90: 5,
    p99: 5,
  },
  percentile_number_of_generated_actions: {
    p50: 5,
    p90: 5,
    p99: 5,
  },
  percentile_alert_counts_active: {
    p50: 5,
    p90: 5,
    p99: 5,
  },
  percentile_alert_counts_new: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_alert_counts_recovered: {
    p50: 1,
    p90: 1,
    p99: 1,
  },
  execution_failures: {
    doc_count: 2,
    by_reason: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'decrypt',
          doc_count: 2,
        },
      ],
    },
  },
});
const logsAlertDocumentCountAggResult = getAggResult({
  key: 'logs.alert.document.count',
  doc_count: 28,
  avg_event_duration: 88321428.57142857,
  avg_kibana_task_schedule_delay: 3015054.24547,
  avg_number_of_searches: 1.1,
  avg_total_indexing_duration_ms: 88.245354,
  avg_es_search_duration_ms: 26.962962962962962,
  avg_total_search_duration_ms: 31.296296296296298,
  avg_execution_gap_duration_s: 10.43457,
  avg_rule_type_run_duration_ms: 7.237357,
  avg_process_alerts_duration_ms: 33.35745237,
  avg_trigger_actions_duration_ms: 9.53737,
  avg_process_rule_duration_ms: 8.53737,
  avg_claim_to_start_duration_ms: 15.53737,
  avg_prepare_rule_duration_ms: 9.327357,
  avg_total_run_duration_ms: 89.53735,
  avg_total_enrichment_duration_ms: 72.575237,
  percentile_number_of_triggered_actions: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_number_of_generated_actions: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  percentile_alert_counts_active: {
    p50: 1,
    p90: 1,
    p99: 5,
  },
  percentile_alert_counts_new: {
    p50: 1,
    p90: 1,
    p99: 5,
  },
  percentile_alert_counts_recovered: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  execution_failures: {
    doc_count: 1,
    by_reason: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'decrypt',
          doc_count: 1,
        },
      ],
    },
  },
});

const aggResult = getAggResult({
  avg_event_duration: 288250000.07692307,
  avg_kibana_task_schedule_delay: 1541564.2432,
  avg_number_of_searches: 1.2,
  avg_total_indexing_duration_ms: 28.630434782608695,
  avg_es_search_duration_ms: 26.246376811594203,
  avg_total_search_duration_ms: 43.74647887323944,
  avg_execution_gap_duration_s: 3.4564534,
  avg_rule_type_run_duration_ms: 6.454324687,
  avg_process_alerts_duration_ms: 11.48654234,
  avg_trigger_actions_duration_ms: 5.15646487,
  avg_process_rule_duration_ms: 14.8743546857,
  avg_claim_to_start_duration_ms: 55.5645324168,
  avg_prepare_rule_duration_ms: 6.567687,
  avg_total_run_duration_ms: 101.46745347,
  avg_total_enrichment_duration_ms: 47.5757,
  percentile_number_of_triggered_actions: {
    p50: 0,
    p90: 5,
    p99: 5,
  },
  percentile_number_of_generated_actions: {
    p50: 0,
    p90: 5,
    p99: 5,
  },
  percentile_alert_counts_active: {
    p50: 1,
    p90: 5,
    p99: 5,
  },
  percentile_alert_counts_new: {
    p50: 0,
    p90: 1,
    p99: 1,
  },
  percentile_alert_counts_recovered: {
    p50: 0,
    p90: 0,
    p99: 0,
  },
  execution_failures: {
    doc_count: 10,
    by_reason: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'decrypt',
          doc_count: 6,
        },
        {
          key: 'execute',
          doc_count: 4,
        },
      ],
    },
  },
});

describe('event log telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseRuleTypeBucket', () => {
    test('should correctly parse rule type bucket results', () => {
      expect(
        parseRuleTypeBucket([
          indexThresholdAggResult,
          documentTestAggResult,
          logsAlertDocumentCountAggResult,
        ])
      ).toEqual({
        countRuleExecutionsByType: {
          '__index-threshold': 78,
          document__test__: 42,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 28,
        },
        avg_event_duration_by_type_per_day: {
          '__index-threshold': 100576923,
          document__test__: 770071429,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 88321429,
        },
        avg_kibana_task_schedule_delay_by_type_per_day: {
          '__index-threshold': 1541564,
          document__test__: 4542467,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 3015054,
        },
        percentile_number_of_triggered_actions_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        percentile_number_of_generated_actions_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        percentile_alert_counts_active_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 5,
          },
        },
        percentile_alert_counts_new_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 5,
          },
        },
        percentile_alert_counts_recovered_by_type_per_day: {
          p50: {
            '__index-threshold': 0,
            document__test__: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 0,
            document__test__: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 0,
            document__test__: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        avg_number_of_searches_by_type_per_day: {
          '__index-threshold': 1,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 1,
        },
        avg_total_indexing_duration_ms_by_type_per_day: {
          '__index-threshold': 33,
          document__test__: 11,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 88,
        },
        avg_es_search_duration_ms_by_type_per_day: {
          '__index-threshold': 41,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 27,
        },
        avg_total_search_duration_ms_by_type_per_day: {
          '__index-threshold': 44,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 31,
        },
        avg_execution_gap_duration_s_by_type_per_day: {
          '__index-threshold': 3,
          document__test__: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 10,
        },
        avg_rule_type_run_duration_ms_by_type_per_day: {
          '__index-threshold': 6,
          document__test__: 4,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 7,
        },
        avg_process_alerts_duration_ms_by_type_per_day: {
          '__index-threshold': 11,
          document__test__: 3,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 33,
        },
        avg_trigger_actions_duration_ms_by_type_per_day: {
          '__index-threshold': 5,
          document__test__: 8,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 10,
        },
        avg_process_rule_duration_ms_by_type_per_day: {
          '__index-threshold': 15,
          document__test__: 20,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 9,
        },
        avg_claim_to_start_duration_ms_by_type_per_day: {
          '__index-threshold': 56,
          document__test__: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 16,
        },
        avg_prepare_rule_duration_ms_by_type_per_day: {
          '__index-threshold': 7,
          document__test__: 10,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 9,
        },
        avg_total_run_duration_ms_by_type_per_day: {
          '__index-threshold': 101,
          document__test__: 78,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 90,
        },
        avg_total_enrichment_duration_ms_by_type_per_day: {
          '__index-threshold': 48,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 73,
        },
      });
    });

    test('should handle missing values', () => {
      expect(
        parseRuleTypeBucket([
          {
            ...indexThresholdAggResult,
            // @ts-expect-error
            percentile_number_of_generated_actions: {},
          },
          {
            ...documentTestAggResult,
            // @ts-expect-error
            doc_count: undefined,
            // @ts-expect-error
            avg_event_duration: {},
          },
          // @ts-expect-error
          {
            key: 'logs.alert.document.count',
          },
        ])
      ).toEqual({
        countRuleExecutionsByType: {
          '__index-threshold': 78,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 0,
        },
        avg_event_duration_by_type_per_day: {
          '__index-threshold': 100576923,
          document__test__: 0,
        },
        avg_kibana_task_schedule_delay_by_type_per_day: {
          '__index-threshold': 1541564,
          document__test__: 4542467,
        },
        percentile_number_of_triggered_actions_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
          },
        },
        percentile_number_of_generated_actions_by_type_per_day: {
          p50: {
            document__test__: 5,
          },
          p90: {
            document__test__: 5,
          },
          p99: {
            document__test__: 5,
          },
        },
        percentile_alert_counts_active_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
          },
        },
        percentile_alert_counts_new_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 0,
          },
        },
        percentile_alert_counts_recovered_by_type_per_day: {
          p50: {
            '__index-threshold': 0,
            document__test__: 1,
          },
          p90: {
            '__index-threshold': 0,
            document__test__: 1,
          },
          p99: {
            '__index-threshold': 0,
            document__test__: 1,
          },
        },
        avg_number_of_searches_by_type_per_day: {
          '__index-threshold': 1,
          document__test__: 0,
        },
        avg_total_indexing_duration_ms_by_type_per_day: {
          '__index-threshold': 33,
          document__test__: 11,
        },
        avg_es_search_duration_ms_by_type_per_day: {
          '__index-threshold': 41,
          document__test__: 0,
        },
        avg_total_search_duration_ms_by_type_per_day: {
          '__index-threshold': 44,
          document__test__: 0,
        },
        avg_execution_gap_duration_s_by_type_per_day: {
          '__index-threshold': 3,
          document__test__: 2,
        },
        avg_rule_type_run_duration_ms_by_type_per_day: {
          '__index-threshold': 6,
          document__test__: 4,
        },
        avg_process_alerts_duration_ms_by_type_per_day: {
          '__index-threshold': 11,
          document__test__: 3,
        },
        avg_trigger_actions_duration_ms_by_type_per_day: {
          '__index-threshold': 5,
          document__test__: 8,
        },
        avg_process_rule_duration_ms_by_type_per_day: {
          '__index-threshold': 15,
          document__test__: 20,
        },
        avg_claim_to_start_duration_ms_by_type_per_day: {
          '__index-threshold': 56,
          document__test__: 1,
        },
        avg_prepare_rule_duration_ms_by_type_per_day: {
          '__index-threshold': 7,
          document__test__: 10,
        },
        avg_total_run_duration_ms_by_type_per_day: {
          '__index-threshold': 101,
          document__test__: 78,
        },
        avg_total_enrichment_duration_ms_by_type_per_day: {
          '__index-threshold': 48,
          document__test__: 0,
        },
      });
    });

    test('should handle empty input', () => {
      expect(parseRuleTypeBucket([])).toEqual({
        countRuleExecutionsByType: {},
        avg_event_duration_by_type_per_day: {},
        avg_kibana_task_schedule_delay_by_type_per_day: {},
        percentile_number_of_triggered_actions_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_number_of_generated_actions_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_alert_counts_active_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_alert_counts_new_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_alert_counts_recovered_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        avg_number_of_searches_by_type_per_day: {},
        avg_total_indexing_duration_ms_by_type_per_day: {},
        avg_es_search_duration_ms_by_type_per_day: {},
        avg_total_search_duration_ms_by_type_per_day: {},
        avg_execution_gap_duration_s_by_type_per_day: {},
        avg_rule_type_run_duration_ms_by_type_per_day: {},
        avg_process_alerts_duration_ms_by_type_per_day: {},
        avg_trigger_actions_duration_ms_by_type_per_day: {},
        avg_process_rule_duration_ms_by_type_per_day: {},
        avg_claim_to_start_duration_ms_by_type_per_day: {},
        avg_prepare_rule_duration_ms_by_type_per_day: {},
        avg_total_run_duration_ms_by_type_per_day: {},
        avg_total_enrichment_duration_ms_by_type_per_day: {},
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseRuleTypeBucket(undefined)).toEqual({
        countRuleExecutionsByType: {},
        avg_event_duration_by_type_per_day: {},
        avg_kibana_task_schedule_delay_by_type_per_day: {},
        percentile_number_of_triggered_actions_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_number_of_generated_actions_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_alert_counts_active_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_alert_counts_new_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        percentile_alert_counts_recovered_by_type_per_day: {
          p50: {},
          p90: {},
          p99: {},
        },
        avg_number_of_searches_by_type_per_day: {},
        avg_total_indexing_duration_ms_by_type_per_day: {},
        avg_es_search_duration_ms_by_type_per_day: {},
        avg_total_search_duration_ms_by_type_per_day: {},
        avg_execution_gap_duration_s_by_type_per_day: {},
        avg_rule_type_run_duration_ms_by_type_per_day: {},
        avg_process_alerts_duration_ms_by_type_per_day: {},
        avg_trigger_actions_duration_ms_by_type_per_day: {},
        avg_process_rule_duration_ms_by_type_per_day: {},
        avg_claim_to_start_duration_ms_by_type_per_day: {},
        avg_prepare_rule_duration_ms_by_type_per_day: {},
        avg_total_run_duration_ms_by_type_per_day: {},
        avg_total_enrichment_duration_ms_by_type_per_day: {},
      });
    });
  });

  describe('parsePercentileAggs', () => {
    test('should correctly format percentile aggregation output', () => {
      expect(
        parsePercentileAggs(
          {
            '50.0': 1,
            '90.0': 2,
            '99.0': 3,
          },
          'ruleTypeId'
        )
      ).toEqual({
        p50: {
          ruleTypeId: 1,
        },
        p90: {
          ruleTypeId: 2,
        },
        p99: {
          ruleTypeId: 3,
        },
      });
    });

    test('should correctly format percentile aggregation output when no rule type is specified', () => {
      expect(
        parsePercentileAggs({
          '50.0': 1,
          '90.0': 2,
          '99.0': 3,
        })
      ).toEqual({
        p50: 1,
        p90: 2,
        p99: 3,
      });
    });

    test('should handle unknown keys', () => {
      expect(
        parsePercentileAggs(
          {
            '50.0': 1,
            '70.0': 2,
            '99.0': 3,
          },
          'ruleTypeId'
        )
      ).toEqual({
        p50: {
          ruleTypeId: 1,
        },
        p99: {
          ruleTypeId: 3,
        },
      });
    });

    test('should handle empty input', () => {
      expect(parsePercentileAggs({}, 'ruleTypeId')).toEqual({});
    });

    test('should handle undefined input', () => {
      expect(
        parsePercentileAggs(undefined as unknown as Record<string, number>, 'ruleTypeId')
      ).toEqual({});
    });
  });

  describe('parseExecutionFailureByRuleType', () => {
    test('should format execution failures by rule type', () => {
      expect(
        parseExecutionFailureByRuleType([
          indexThresholdAggResult,
          documentTestAggResult,
          logsAlertDocumentCountAggResult,
        ])
      ).toEqual({
        countFailedExecutionsByReasonByType: {
          decrypt: {
            '__index-threshold': 3,
            document__test__: 2,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          execute: {
            '__index-threshold': 4,
          },
        },
      });
    });

    test('should handle results with some empty execution failures', () => {
      expect(
        parseExecutionFailureByRuleType([
          {
            ...indexThresholdAggResult,
            execution_failures: {
              doc_count: 9,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
          },
          documentTestAggResult,
          logsAlertDocumentCountAggResult,
        ])
      ).toEqual({
        countFailedExecutionsByReasonByType: {
          decrypt: {
            document__test__: 2,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
        },
      });
    });

    test('should handle results with empty execution failures', () => {
      expect(
        parseExecutionFailureByRuleType([
          {
            ...indexThresholdAggResult,
            execution_failures: {
              doc_count: 0,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
          },
          {
            ...documentTestAggResult,
            execution_failures: {
              doc_count: 0,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
          },
          {
            ...logsAlertDocumentCountAggResult,
            execution_failures: {
              doc_count: 0,
              by_reason: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [],
              },
            },
          },
        ])
      ).toEqual({ countFailedExecutionsByReasonByType: {} });
    });

    test('should handle results with no execution failures', () => {
      expect(
        parseExecutionFailureByRuleType([
          {
            ...indexThresholdAggResult,
            // @ts-expect-error
            execution_failures: undefined,
          },
          {
            ...documentTestAggResult,
            // @ts-expect-error
            execution_failures: undefined,
          },
          {
            ...logsAlertDocumentCountAggResult,
            // @ts-expect-error
            execution_failures: undefined,
          },
        ])
      ).toEqual({ countFailedExecutionsByReasonByType: {} });
    });

    test('should handle empty input', () => {
      expect(parseExecutionFailureByRuleType([])).toEqual({
        countFailedExecutionsByReasonByType: {},
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseExecutionFailureByRuleType(undefined)).toEqual({
        countFailedExecutionsByReasonByType: {},
      });
    });
  });

  describe('parseExecutionCountAggregationResults', () => {
    test('should correctly format aggregation results', () => {
      expect(
        parseExecutionCountAggregationResults(
          // @ts-expect-error
          aggResult
        )
      ).toEqual({
        countTotalFailedExecutions: 10,
        countFailedExecutionsByReason: {
          decrypt: 6,
          execute: 4,
        },
        avg_event_duration_per_day: 288250000,
        avg_kibana_task_schedule_delay_per_day: 1541564,
        avg_number_of_searches_per_day: 1,
        avg_total_indexing_duration_ms_per_day: 29,
        avg_es_search_duration_ms_per_day: 26,
        avg_total_search_duration_ms_per_day: 44,
        avg_execution_gap_duration_s_per_day: 3,
        avg_rule_type_run_duration_ms_per_day: 6,
        avg_process_alerts_duration_ms_per_day: 11,
        avg_trigger_actions_duration_ms_per_day: 5,
        avg_process_rule_duration_ms_per_day: 15,
        avg_claim_to_start_duration_ms_per_day: 56,
        avg_prepare_rule_duration_ms_per_day: 7,
        avg_total_run_duration_ms_per_day: 101,
        avg_total_enrichment_duration_ms_per_day: 48,
        percentile_number_of_triggered_actions_per_day: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        percentile_number_of_generated_actions_per_day: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        percentile_alert_counts_active_per_day: {
          p50: 1,
          p90: 5,
          p99: 5,
        },
        percentile_alert_counts_new_per_day: {
          p50: 0,
          p90: 1,
          p99: 1,
        },
        percentile_alert_counts_recovered_per_day: {
          p50: 0,
          p90: 0,
          p99: 0,
        },
      });
    });

    test('should handle missing values', () => {
      expect(
        parseExecutionCountAggregationResults({
          ...aggResult,
          // @ts-expect-error
          avg_es_search_duration_ms: {},
          execution_failures: {
            by_reason: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                // @ts-expect-error
                {
                  key: 'decrypt',
                },
                {
                  key: 'execute',
                  doc_count: 4,
                },
              ],
            },
          },
          // @ts-expect-error
          percentile_number_of_generated_actions: {},
        })
      ).toEqual({
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {
          decrypt: 0,
          execute: 4,
        },
        avg_event_duration_per_day: 288250000,
        avg_kibana_task_schedule_delay_per_day: 1541564,
        avg_number_of_searches_per_day: 1,
        avg_total_indexing_duration_ms_per_day: 29,
        avg_es_search_duration_ms_per_day: 0,
        avg_total_search_duration_ms_per_day: 44,
        avg_execution_gap_duration_s_per_day: 3,
        avg_rule_type_run_duration_ms_per_day: 6,
        avg_process_alerts_duration_ms_per_day: 11,
        avg_trigger_actions_duration_ms_per_day: 5,
        avg_process_rule_duration_ms_per_day: 15,
        avg_claim_to_start_duration_ms_per_day: 56,
        avg_prepare_rule_duration_ms_per_day: 7,
        avg_total_run_duration_ms_per_day: 101,
        avg_total_enrichment_duration_ms_per_day: 48,
        percentile_number_of_triggered_actions_per_day: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        percentile_number_of_generated_actions_per_day: {},
        percentile_alert_counts_active_per_day: {
          p50: 1,
          p90: 5,
          p99: 5,
        },
        percentile_alert_counts_new_per_day: {
          p50: 0,
          p90: 1,
          p99: 1,
        },
        percentile_alert_counts_recovered_per_day: {
          p50: 0,
          p90: 0,
          p99: 0,
        },
      });
    });

    test('should handle empty input', () => {
      // @ts-expect-error
      expect(parseExecutionCountAggregationResults({})).toEqual({
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
      });
    });

    test('should handle undefined input', () => {
      // @ts-expect-error
      expect(parseExecutionCountAggregationResults(undefined)).toEqual({
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
      });
    });
  });

  describe('getExecutionsPerDayCount', () => {
    test('should return counts of executions, failed executions and stats about execution durations', async () => {
      esClient.search.mockResponse({
        took: 4,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 148,
            relation: 'eq',
          },
          max_score: null,
          hits: [],
        },
        aggregations: {
          by_rule_type_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              indexThresholdAggResult,
              documentTestAggResult,
              logsAlertDocumentCountAggResult,
            ],
          },
          by_execution_status: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'success', doc_count: 21 },
              { key: 'failure', doc_count: 22 },
            ],
          },
          ...aggResult,
        },
      });

      const telemetry = await getExecutionsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toStrictEqual({
        countRuleExecutionsByType: {
          '__index-threshold': 78,
          document__test__: 42,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 28,
        },
        avg_event_duration_by_type_per_day: {
          '__index-threshold': 100576923,
          document__test__: 770071429,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 88321429,
        },
        avg_kibana_task_schedule_delay_by_type_per_day: {
          '__index-threshold': 1541564,
          document__test__: 4542467,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 3015054,
        },
        percentile_number_of_triggered_actions_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        percentile_number_of_generated_actions_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        percentile_alert_counts_active_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 5,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 5,
          },
        },
        percentile_alert_counts_new_by_type_per_day: {
          p50: {
            '__index-threshold': 1,
            document__test__: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p90: {
            '__index-threshold': 1,
            document__test__: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          p99: {
            '__index-threshold': 1,
            document__test__: 0,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 5,
          },
        },
        percentile_alert_counts_recovered_by_type_per_day: {
          p50: {
            '__index-threshold': 0,
            document__test__: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p90: {
            '__index-threshold': 0,
            document__test__: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
          p99: {
            '__index-threshold': 0,
            document__test__: 1,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 0,
          },
        },
        avg_number_of_searches_by_type_per_day: {
          '__index-threshold': 1,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 1,
        },
        avg_total_indexing_duration_ms_by_type_per_day: {
          '__index-threshold': 33,
          document__test__: 11,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 88,
        },
        avg_es_search_duration_ms_by_type_per_day: {
          '__index-threshold': 41,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 27,
        },
        avg_total_search_duration_ms_by_type_per_day: {
          '__index-threshold': 44,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 31,
        },
        avg_execution_gap_duration_s_by_type_per_day: {
          '__index-threshold': 3,
          document__test__: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 10,
        },
        avg_rule_type_run_duration_ms_by_type_per_day: {
          '__index-threshold': 6,
          document__test__: 4,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 7,
        },
        avg_process_alerts_duration_ms_by_type_per_day: {
          '__index-threshold': 11,
          document__test__: 3,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 33,
        },
        avg_trigger_actions_duration_ms_by_type_per_day: {
          '__index-threshold': 5,
          document__test__: 8,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 10,
        },
        avg_process_rule_duration_ms_by_type_per_day: {
          '__index-threshold': 15,
          document__test__: 20,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 9,
        },
        avg_claim_to_start_duration_ms_by_type_per_day: {
          '__index-threshold': 56,
          document__test__: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 16,
        },
        avg_prepare_rule_duration_ms_by_type_per_day: {
          '__index-threshold': 7,
          document__test__: 10,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 9,
        },
        avg_total_run_duration_ms_by_type_per_day: {
          '__index-threshold': 101,
          document__test__: 78,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 90,
        },
        avg_total_enrichment_duration_ms_by_type_per_day: {
          '__index-threshold': 48,
          document__test__: 0,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 73,
        },
        countTotalFailedExecutions: 10,
        countFailedExecutionsByReason: {
          decrypt: 6,
          execute: 4,
        },
        avg_event_duration_per_day: 288250000,
        avg_kibana_task_schedule_delay_per_day: 1541564,
        avg_number_of_searches_per_day: 1,
        avg_total_indexing_duration_ms_per_day: 29,
        avg_es_search_duration_ms_per_day: 26,
        avg_total_search_duration_ms_per_day: 44,
        avg_execution_gap_duration_s_per_day: 3,
        avg_rule_type_run_duration_ms_per_day: 6,
        avg_process_alerts_duration_ms_per_day: 11,
        avg_trigger_actions_duration_ms_per_day: 5,
        avg_process_rule_duration_ms_per_day: 15,
        avg_claim_to_start_duration_ms_per_day: 56,
        avg_prepare_rule_duration_ms_per_day: 7,
        avg_total_run_duration_ms_per_day: 101,
        avg_total_enrichment_duration_ms_per_day: 48,
        percentile_number_of_triggered_actions_per_day: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        percentile_number_of_generated_actions_per_day: {
          p50: 0,
          p90: 5,
          p99: 5,
        },
        percentile_alert_counts_active_per_day: {
          p50: 1,
          p90: 5,
          p99: 5,
        },
        percentile_alert_counts_new_per_day: {
          p50: 0,
          p90: 1,
          p99: 1,
        },
        percentile_alert_counts_recovered_per_day: {
          p50: 0,
          p90: 0,
          p99: 0,
        },
        countFailedExecutionsByReasonByType: {
          decrypt: {
            '__index-threshold': 3,
            document__test__: 2,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            logs__alert__document__count: 1,
          },
          execute: {
            '__index-threshold': 4,
          },
        },
        countTotalRuleExecutions: 148,
        countRulesByExecutionStatus: {
          failure: 22,
          success: 21,
        },
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValue(new Error('oh no'));

      const telemetry = await getExecutionsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getExecutionsPerDayCount - {}"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        hasErrors: true,
        errorMessage: 'oh no',
        countRuleExecutionsByType: {},
        avg_event_duration_by_type_per_day: {},
        avg_kibana_task_schedule_delay_by_type_per_day: {},
        percentile_number_of_triggered_actions_by_type_per_day: { p50: {}, p90: {}, p99: {} },
        percentile_number_of_generated_actions_by_type_per_day: { p50: {}, p90: {}, p99: {} },
        percentile_alert_counts_active_by_type_per_day: { p50: {}, p90: {}, p99: {} },
        percentile_alert_counts_new_by_type_per_day: { p50: {}, p90: {}, p99: {} },
        percentile_alert_counts_recovered_by_type_per_day: { p50: {}, p90: {}, p99: {} },
        avg_number_of_searches_by_type_per_day: {},
        avg_total_indexing_duration_ms_by_type_per_day: {},
        avg_es_search_duration_ms_by_type_per_day: {},
        avg_total_search_duration_ms_by_type_per_day: {},
        avg_execution_gap_duration_s_by_type_per_day: {},
        avg_rule_type_run_duration_ms_by_type_per_day: {},
        avg_process_alerts_duration_ms_by_type_per_day: {},
        avg_trigger_actions_duration_ms_by_type_per_day: {},
        avg_process_rule_duration_ms_by_type_per_day: {},
        avg_claim_to_start_duration_ms_by_type_per_day: {},
        avg_prepare_rule_duration_ms_by_type_per_day: {},
        avg_total_run_duration_ms_by_type_per_day: {},
        avg_total_enrichment_duration_ms_by_type_per_day: {},
        countTotalFailedExecutions: 0,
        countFailedExecutionsByReason: {},
        avg_event_duration_per_day: 0,
        avg_kibana_task_schedule_delay_per_day: 0,
        avg_number_of_searches_per_day: 0,
        avg_total_indexing_duration_ms_per_day: 0,
        avg_es_search_duration_ms_per_day: 0,
        avg_total_search_duration_ms_per_day: 0,
        avg_execution_gap_duration_s_per_day: 0,
        avg_rule_type_run_duration_ms_per_day: 0,
        avg_process_alerts_duration_ms_per_day: 0,
        avg_trigger_actions_duration_ms_per_day: 0,
        avg_process_rule_duration_ms_per_day: 0,
        avg_claim_to_start_duration_ms_per_day: 0,
        avg_prepare_rule_duration_ms_per_day: 0,
        avg_total_run_duration_ms_per_day: 0,
        avg_total_enrichment_duration_ms_per_day: 0,
        percentile_number_of_triggered_actions_per_day: { p50: 0, p90: 0, p99: 0 },
        percentile_number_of_generated_actions_per_day: { p50: 0, p90: 0, p99: 0 },
        percentile_alert_counts_active_per_day: { p50: 0, p90: 0, p99: 0 },
        percentile_alert_counts_new_per_day: { p50: 0, p90: 0, p99: 0 },
        percentile_alert_counts_recovered_per_day: { p50: 0, p90: 0, p99: 0 },
        countFailedExecutionsByReasonByType: {},
        countTotalRuleExecutions: 0,
        countRulesByExecutionStatus: {},
      });
    });
  });

  describe('getExecutionTimeoutsPerDayCount', () => {
    test('should return counts of timed out executions and counts by type', async () => {
      esClient.search.mockResponse({
        took: 4,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 4,
            relation: 'eq',
          },
          max_score: null,
          hits: [],
        },
        aggregations: {
          by_rule_type_id: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: '.index-threshold',
                doc_count: 2,
              },
              {
                key: 'logs.alert.document.count',
                doc_count: 1,
              },
              {
                key: 'document.test.',
                doc_count: 1,
              },
            ],
          },
        },
      });

      const telemetry = await getExecutionTimeoutsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);

      expect(telemetry).toStrictEqual({
        countExecutionTimeouts: 4,
        countExecutionTimeoutsByType: {
          '__index-threshold': 2,
          document__test__: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          logs__alert__document__count: 1,
        },
        hasErrors: false,
      });
    });

    test('should return empty results and log warning if query throws error', async () => {
      esClient.search.mockRejectedValue(new Error('oh no'));

      const telemetry = await getExecutionTimeoutsPerDayCount({
        esClient,
        eventLogIndex: 'test',
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const loggerCall = logger.warn.mock.calls[0][0];
      const loggerMeta = logger.warn.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(
        `"Error executing alerting telemetry task: getExecutionsTimeoutsPerDayCount - {}"`
      );
      expect(loggerMeta?.tags).toEqual(['alerting', 'telemetry-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
      expect(telemetry).toStrictEqual({
        countExecutionTimeouts: 0,
        countExecutionTimeoutsByType: {},
        errorMessage: 'oh no',
        hasErrors: true,
      });
    });
  });
});
