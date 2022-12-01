/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, merge } from 'lodash';
import type {
  AggregationsKeyedPercentiles,
  AggregationsSingleBucketAggregateBase,
  AggregationsPercentilesAggregateBase,
  AggregationsSingleMetricAggregateBase,
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
  AggregationsBuckets,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import mappings from '@kbn/event-log-plugin/generated/mappings.json';
import { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import {
  NUM_ALERTING_RULE_TYPES,
  NUM_ALERTING_EXECUTION_FAILURE_REASON_TYPES,
} from '../alerting_usage_collector';
import { replaceDotSymbols } from './replace_dots_with_underscores';
import { parseSimpleRuleTypeBucket } from './parse_simple_rule_type_bucket';
import {
  EventUsageAggregations,
  EventUsageAggregationType,
  EventUsageSchema,
} from '../generated/event_log_telemetry_types';

const Millis2Nanos = 1000 * 1000;
const percentileFieldNameMapping: Record<string, string> = {
  '50.0': 'p50',
  '90.0': 'p90',
  '99.0': 'p99',
};

interface Opts {
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  logger: Logger;
}

interface GetExecutionsPerDayCountResults extends EventUsageSchema {
  hasErrors: boolean;
  errorMessage?: string;
  countTotalRuleExecutions: number;
  countRuleExecutionsByType: Record<string, number>;
  countTotalFailedExecutions: number;
  countFailedExecutionsByReason: Record<string, number>;
  countFailedExecutionsByReasonByType: Record<string, Record<string, number>>;
  countRulesByExecutionStatus: Record<string, number>;
}
interface GetExecutionTimeoutsPerDayCountResults {
  hasErrors: boolean;
  errorMessage?: string;
  countExecutionTimeouts: number;
  countExecutionTimeoutsByType: Record<string, number>;
}
interface GetExecutionCountsExecutionFailures extends AggregationsSingleBucketAggregateBase {
  by_reason: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
}
interface GetExecutionCountsAggregationBucket extends AggregationsStringTermsBucketKeys {
  avg_execution_time: AggregationsSingleMetricAggregateBase;
  avg_es_search_duration: AggregationsSingleMetricAggregateBase;
  avg_total_search_duration: AggregationsSingleMetricAggregateBase;
  execution_failures: GetExecutionCountsExecutionFailures;
  percentile_scheduled_actions: AggregationsPercentilesAggregateBase;
  percentile_alerts: AggregationsPercentilesAggregateBase;
}

interface IGetExecutionFailures extends AggregationsSingleBucketAggregateBase {
  by_reason: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
}

interface IAggResult extends EventUsageAggregationType, Record<string, AggregationsAggregate> {
  by_rule_type_id: AggregationsTermsAggregateBase<GetExecutionCountsAggregationBucket>;
  execution_failures: IGetExecutionFailures;
  by_execution_status: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
}

const numericMappingTypes = ['integer', 'long', 'float'];

function parseMappingHelper(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _mappings: any,
  accumulatedFieldMappings: string[] = [],
  fieldName: string = ''
) {
  if (_mappings.properties) {
    Object.keys(_mappings.properties).forEach((field: string) => {
      const numericField = parseMappingHelper(
        _mappings.properties[field],
        accumulatedFieldMappings,
        fieldName.length > 0 ? `${fieldName}.${field}` : field
      );
      if (numericField) {
        accumulatedFieldMappings.push(numericField);
      }
    });
  } else {
    if (_mappings.type && numericMappingTypes.includes(_mappings.type)) {
      return fieldName;
    } else {
      return null;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseNumericMappings(_mappings: any) {
  const numericFields: string[] = [];
  parseMappingHelper(_mappings, numericFields);
  return numericFields;
}

function getAggNameFromField(fieldName: string) {
  // remove 'kibana.alert.rule.execution.metrics.' prefix if it exists
  return fieldName.replace('kibana.alert.rule.execution.metrics.', '').replaceAll('.', '_');
}

const excludeList = [
  'event.risk_score',
  'event.risk_score_norm',
  'event.sequence',
  'event.severity',
  'kibana.alert.rule.execution.status_order',
];

const aggTypeMapping: Record<string, string> = {
  'kibana.alert.rule.execution.metrics.number_of_generated_actions': 'percentile',
  'kibana.alert.rule.execution.metrics.alert_counts.active': 'percentile',
};

export function buildEventLogAggsFromMapping() {
  const numericEventLogFields = parseNumericMappings(mappings);
  return numericEventLogFields.reduce((acc, fieldName: string) => {
    if (excludeList.includes(fieldName)) {
      return acc;
    }

    const aggName = getAggNameFromField(fieldName);
    const aggType = aggTypeMapping[fieldName];

    let agg;
    switch (aggType) {
      case 'percentile':
        agg = {
          [`percentile_${aggName}`]: {
            percentiles: {
              field: fieldName,
              percents: [50, 90, 99],
            },
          },
        };
        break;
      default:
        agg = {
          [`avg_${aggName}`]: {
            avg: {
              field: fieldName,
            },
          },
        };
    }
    return {
      ...acc,
      ...agg,
    };
  }, {});
}

export async function getExecutionsPerDayCount({
  esClient,
  eventLogIndex,
  logger,
}: Opts): Promise<GetExecutionsPerDayCountResults> {
  try {
    const eventLogAggs = {
      execution_failures: {
        filter: {
          term: {
            'event.outcome': 'failure',
          },
        },
        aggs: {
          by_reason: {
            terms: {
              field: 'event.reason',
              size: NUM_ALERTING_EXECUTION_FAILURE_REASON_TYPES,
            },
          },
        },
      },
      ...EventUsageAggregations,
    };

    const query = {
      index: eventLogIndex,
      size: 0,
      body: {
        query: getProviderAndActionFilterForTimeRange('execute'),
        aggs: {
          ...eventLogAggs,
          by_rule_type_id: {
            terms: {
              field: 'rule.category',
              size: NUM_ALERTING_RULE_TYPES,
            },
            aggs: eventLogAggs,
          },
          by_execution_status: {
            terms: {
              field: 'event.outcome',
            },
          },
        },
      },
    };

    logger.debug(`query for getExecutionsPerDayCount - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(`results for getExecutionsPerDayCount query - ${JSON.stringify(results)}`);

    const totalRuleExecutions =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const aggregations = results.aggregations as IAggResult;
    const aggregationsByRuleTypeId: AggregationsBuckets<GetExecutionCountsAggregationBucket> =
      aggregations.by_rule_type_id.buckets as GetExecutionCountsAggregationBucket[];

    return {
      hasErrors: false,
      ...parseRuleTypeBucket(aggregationsByRuleTypeId),
      ...parseExecutionFailureByRuleType(aggregationsByRuleTypeId),
      ...parseExecutionCountAggregationResults(aggregations),
      countTotalRuleExecutions: totalRuleExecutions ?? 0,
      countRulesByExecutionStatus: parseSimpleRuleTypeBucket(
        aggregations.by_execution_status.buckets
      ),
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();
    logger.warn(
      `Error executing alerting telemetry task: getExecutionsPerDayCount - ${JSON.stringify(err)}`,
      {
        tags: ['alerting', 'telemetry-failed'],
        error: { stack_trace: err.stack },
      }
    );
    return {
      hasErrors: true,
      errorMessage,
      countTotalRuleExecutions: 0,
      countRuleExecutionsByType: {},
      countTotalFailedExecutions: 0,
      countFailedExecutionsByReason: {},
      countFailedExecutionsByReasonByType: {},
      avgExecutionTime: 0,
      avgExecutionTimeByType: {},
      avgEsSearchDuration: 0,
      avgEsSearchDurationByType: {},
      avgTotalSearchDuration: 0,
      avgTotalSearchDurationByType: {},
      generatedActionsPercentiles: {},
      generatedActionsPercentilesByType: {},
      alertsPercentiles: {},
      alertsPercentilesByType: {},
      countRulesByExecutionStatus: {},
    };
  }
}

export async function getExecutionTimeoutsPerDayCount({
  esClient,
  eventLogIndex,
  logger,
}: Opts): Promise<GetExecutionTimeoutsPerDayCountResults> {
  try {
    const query = {
      index: eventLogIndex,
      size: 0,
      body: {
        query: getProviderAndActionFilterForTimeRange('execute-timeout'),
        aggs: {
          by_rule_type_id: {
            terms: {
              field: 'rule.category',
              size: NUM_ALERTING_RULE_TYPES,
            },
          },
        },
      },
    };

    logger.debug(`query for getExecutionTimeoutsPerDayCount - ${JSON.stringify(query)}`);
    const results = await esClient.search(query);

    logger.debug(`results for getExecutionTimeoutsPerDayCount query - ${JSON.stringify(results)}`);

    const aggregations = results.aggregations as {
      by_rule_type_id: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
    };

    const totalTimedoutExecutionsCount =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    return {
      hasErrors: false,
      countExecutionTimeouts: totalTimedoutExecutionsCount ?? 0,
      countExecutionTimeoutsByType: parseSimpleRuleTypeBucket(aggregations.by_rule_type_id.buckets),
    };
  } catch (err) {
    const errorMessage = err && err.message ? err.message : err.toString();

    logger.warn(
      `Error executing alerting telemetry task: getExecutionsTimeoutsPerDayCount - ${JSON.stringify(
        err
      )}`,
      {
        tags: ['alerting', 'telemetry-failed'],
        error: { stack_trace: err.stack },
      }
    );
    return {
      hasErrors: true,
      errorMessage,
      countExecutionTimeouts: 0,
      countExecutionTimeoutsByType: {},
    };
  }
}

/**
 * Bucket format:
 * {
 *   key: '.index-threshold',             // rule type id
 *   doc_count: 78,                       // count of number of executions
 *   avg_es_search_duration: {            // average es search duration across executions
 *     value: 40.76056338028169,
 *   },
 *   percentile_alerts: {                 // stats for number of alerts created across executions
 *     values: {
 *       '50.0': 1,
 *       '95.0': 1,
 *       '99.0': 1,
 *     },
 *   },
 *   execution_failures: {
 *     doc_count: 7,                      // count of number of failed executions
 *     by_reason: {
 *       doc_count_error_upper_bound: 0,
 *       sum_other_doc_count: 0,
 *       buckets: [
 *         {
 *           key: 'execute',              // breakdown of reason for execution failures
 *           doc_count: 4,
 *         },
 *         {
 *           key: 'decrypt',
 *           doc_count: 3,
 *         },
 *       ],
 *     },
 *   },
 *   percentile_scheduled_actions: {      // stats for number of actions generated across executions
 *     values: {
 *       '50.0': 0,
 *       '95.0': 0,
 *       '99.0': 0,
 *     },
 *   },
 *   avg_execution_time: {                // average execution time in nanoseconds across executions
 *     value: 100576923.07692307,
 *   },
 *   avg_total_search_duration: {         // average total search duration across executions
 *     value: 43.74647887323944,
 *   },
 *   by_execution_status: {
 *      "doc_count_error_upper_bound":0,
 *      "sum_other_doc_count":0,
 *      "buckets":[
 *        {"key":"success","doc_count":48},
 *        {"key":"failure","doc_count":1}
 *      ]
 *   }
 * }
 */

export function parseRuleTypeBucket(
  buckets: GetExecutionCountsAggregationBucket[]
): Pick<
  GetExecutionsPerDayCountResults,
  | 'countRuleExecutionsByType'
  | 'avgExecutionTimeByType'
  | 'avgEsSearchDurationByType'
  | 'avgTotalSearchDurationByType'
  | 'generatedActionsPercentilesByType'
  | 'alertsPercentilesByType'
> {
  let summary = {
    countRuleExecutionsByType: {},
    avgExecutionTimeByType: {},
    avgEsSearchDurationByType: {},
    avgTotalSearchDurationByType: {},
    generatedActionsPercentilesByType: { p50: {}, p90: {}, p99: {} },
    alertsPercentilesByType: { p50: {}, p90: {}, p99: {} },
  };
  for (const bucket of buckets ?? []) {
    const ruleType: string = replaceDotSymbols(bucket?.key) ?? '';
    const numExecutions: number = bucket?.doc_count ?? 0;
    const avgExecutionTimeNanos = bucket?.avg_execution_time?.value ?? 0;
    const avgEsSearchTimeMillis = bucket?.avg_es_search_duration?.value ?? 0;
    const avgTotalSearchTimeMillis = bucket?.avg_total_search_duration?.value ?? 0;
    const actionPercentiles = bucket?.percentile_scheduled_actions?.values ?? {};
    const alertPercentiles = bucket?.percentile_alerts?.values ?? {};

    summary = {
      countRuleExecutionsByType: {
        ...summary.countRuleExecutionsByType,
        [ruleType]: numExecutions,
      },
      avgExecutionTimeByType: {
        ...summary.avgExecutionTimeByType,
        [ruleType]: Math.round(avgExecutionTimeNanos / Millis2Nanos),
      },
      avgEsSearchDurationByType: {
        ...summary.avgEsSearchDurationByType,
        [ruleType]: Math.round(avgEsSearchTimeMillis),
      },
      avgTotalSearchDurationByType: {
        ...summary.avgTotalSearchDurationByType,
        [ruleType]: Math.round(avgTotalSearchTimeMillis),
      },
      generatedActionsPercentilesByType: merge(
        summary.generatedActionsPercentilesByType,
        parsePercentileAggs(actionPercentiles as AggregationsKeyedPercentiles, ruleType)
      ),
      alertsPercentilesByType: merge(
        summary.alertsPercentilesByType,
        parsePercentileAggs(alertPercentiles as AggregationsKeyedPercentiles, ruleType)
      ),
    };
  }

  return summary;
}

interface FlattenedExecutionFailureBucket {
  ruleType: string;
  key: string;
  doc_count: number;
}

export function parseExecutionFailureByRuleType(
  buckets: GetExecutionCountsAggregationBucket[]
): Pick<GetExecutionsPerDayCountResults, 'countFailedExecutionsByReasonByType'> {
  const executionFailuresWithRuleTypeBuckets: FlattenedExecutionFailureBucket[] = flatMap(
    buckets ?? [],
    (bucket) => {
      const ruleType: string = replaceDotSymbols(bucket.key);

      /**
       * Execution failure bucket format
       * [
       *   {
       *     key: 'execute',
       *     doc_count: 4,
       *   },
       *   {
       *     key: 'decrypt',
       *     doc_count: 3,
       *   },
       * ]
       */

      const executionFailuresBuckets = bucket?.execution_failures?.by_reason
        ?.buckets as AggregationsStringTermsBucketKeys[];
      return (executionFailuresBuckets ?? []).map((b) => ({ ...b, ruleType }));
    }
  );

  const parsedFailures = (executionFailuresWithRuleTypeBuckets ?? []).reduce(
    (acc: Record<string, Record<string, number>>, bucket: FlattenedExecutionFailureBucket) => {
      const ruleType: string = bucket.ruleType;
      const reason: string = bucket.key;

      if (acc[reason]) {
        if (acc[reason][ruleType]) {
          return {
            ...acc,
            [reason]: {
              ...acc[reason],
              [ruleType]: acc[reason][ruleType] + bucket.doc_count,
            },
          };
        }
        return {
          ...acc,
          [reason]: {
            ...acc[reason],
            [ruleType]: bucket.doc_count,
          },
        };
      }
      return {
        ...acc,
        [reason]: {
          [ruleType]: bucket.doc_count,
        },
      };
    },
    {}
  );

  return {
    countFailedExecutionsByReasonByType: parsedFailures,
  };
}

export function parsePercentileAggs(
  percentiles: AggregationsKeyedPercentiles,
  ruleTypeId?: string
) {
  return Object.keys(percentiles ?? {}).reduce((acc, percentileKey: string) => {
    let result = {};
    const percentileKeyMapped = percentileFieldNameMapping[percentileKey];
    if (percentileKeyMapped) {
      if (ruleTypeId) {
        result = {
          [percentileKeyMapped]: {
            [ruleTypeId]: percentiles[percentileKey] ?? 0,
          },
        };
      } else {
        result = {
          [percentileKeyMapped]: percentiles[percentileKey] ?? 0,
        };
      }
    }
    return {
      ...acc,
      ...result,
    };
  }, {});
}

/**
 * Aggregation Result Format (minus rule type id agg buckets)
 * {
 *   avg_es_search_duration: {
 *     value: 26.246376811594203,
 *   },
 *   percentile_alerts: {
 *     values: {
 *       '50.0': 1,
 *       '90.0': 5,
 *       '99.0': 5,
 *     },
 *   },
 *   execution_failures: {
 *     doc_count: 10,
 *     by_reason: {
 *       doc_count_error_upper_bound: 0,
 *       sum_other_doc_count: 0,
 *       buckets: [
 *         {
 *           key: 'decrypt',
 *           doc_count: 6,
 *         },
 *         {
 *           key: 'execute',
 *           doc_count: 4,
 *         },
 *       ],
 *     },
 *   },
 *   percentile_scheduled_actions: {
 *     values: {
 *       '50.0': 0,
 *       '95.0': 5,
 *       '99.0': 5,
 *     },
 *   },
 *   avg_execution_time: {
 *     value: 288250000,
 *   },
 *   avg_total_search_duration: {
 *     value: 28.630434782608695,
 *   },
 */
export function parseExecutionCountAggregationResults(
  results: IAggResult
): Pick<
  GetExecutionsPerDayCountResults,
  | 'countTotalFailedExecutions'
  | 'countFailedExecutionsByReason'
  | 'avgExecutionTime'
  | 'avgEsSearchDuration'
  | 'avgTotalSearchDuration'
  | 'generatedActionsPercentiles'
  | 'alertsPercentiles'
> {
  const avgExecutionTimeNanos = results?.avg_execution_time?.value ?? 0;
  const avgEsSearchDurationMillis = results?.avg_es_search_duration?.value ?? 0;
  const avgTotalSearchDurationMillis = results?.avg_total_search_duration?.value ?? 0;
  const executionFailuresByReasonBuckets =
    (results?.execution_failures?.by_reason?.buckets as AggregationsStringTermsBucketKeys[]) ?? [];
  const actionPercentiles = results?.percentile_scheduled_actions?.values ?? {};
  const alertPercentiles = results?.percentile_alerts?.values ?? {};

  return {
    countTotalFailedExecutions: results?.execution_failures?.doc_count ?? 0,
    countFailedExecutionsByReason: executionFailuresByReasonBuckets.reduce(
      (acc: Record<string, number>, bucket: AggregationsStringTermsBucketKeys) => {
        const reason: string = bucket.key;
        return {
          ...acc,
          [reason]: bucket.doc_count ?? 0,
        };
      },
      {}
    ),
    avgExecutionTime: Math.round(avgExecutionTimeNanos / Millis2Nanos),
    avgEsSearchDuration: Math.round(avgEsSearchDurationMillis),
    avgTotalSearchDuration: Math.round(avgTotalSearchDurationMillis),
    generatedActionsPercentiles: parsePercentileAggs(
      actionPercentiles as AggregationsKeyedPercentiles
    ),
    alertsPercentiles: parsePercentileAggs(alertPercentiles as AggregationsKeyedPercentiles),
  };
}

function getProviderAndActionFilterForTimeRange(
  action: string,
  provider: string = 'alerting',
  range: string = '1d'
) {
  return {
    bool: {
      filter: {
        bool: {
          must: [
            {
              term: { 'event.action': action },
            },
            {
              term: { 'event.provider': provider },
            },
            {
              range: {
                '@timestamp': {
                  gte: `now-${range}`,
                },
              },
            },
          ],
        },
      },
    },
  };
}
