/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import Boom from '@hapi/boom';
import { AggregateEventsBySavedObjectResult } from '../../../event_log/server';

const PROVIDER_FIELD = 'event.provider';
const START_FIELD = 'event.start';
const ACTION_FIELD = 'event.action';
const OUTCOME_FIELD = 'event.outcome';
const DURATION_FIELD = 'event.duration';
const MESSAGE_FIELD = 'message';
const ES_SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.es_search_duration_ms';
const TOTAL_SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.total_search_duration_ms';
const NUMBER_OF_TRIGGERED_ACTIONS_FIELD =
  'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
const EXECUTION_UUID_FIELD = 'kibana.alert.rule.execution.uuid';

const Millis2Nanos = 1000 * 1000;

export interface IExecutionLog {
  id: string;
  timestamp: string;
  duration_ms: number;
  status: string;
  message: string;
  num_active_alerts: number;
  num_new_alerts: number;
  num_recovered_alerts: number;
  num_triggered_actions: number;
  num_succeeded_actions: number;
  num_errored_actions: number;
  total_search_duration_ms: number;
  es_search_duration_ms: number;
  timed_out: boolean;
}

interface IAlertCounts extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: {
    activeAlerts: estypes.AggregationsSingleBucketAggregateBase;
    newAlerts: estypes.AggregationsSingleBucketAggregateBase;
    recoveredAlerts: estypes.AggregationsSingleBucketAggregateBase;
  };
}

interface IActionExecution
  extends estypes.AggregationsTermsAggregateBase<{ key: string; doc_count: number }> {
  buckets: Array<{ key: string; doc_count: number }>;
}

interface IBucketAggregationResult extends estypes.AggregationsStringTermsBucketKeys {
  timeoutMessage: estypes.AggregationsMultiBucketBase;
  ruleExecution: {
    executeStartTime: estypes.AggregationsMinAggregate;
    executionDuration: estypes.AggregationsMaxAggregate;
    esSearchDuration: estypes.AggregationsMaxAggregate;
    totalSearchDuration: estypes.AggregationsMaxAggregate;
    numTriggeredActions: estypes.AggregationsMaxAggregate;
    outcomeAndMessage: estypes.AggregationsTopHitsAggregate;
  };
  alertCounts: IAlertCounts;
  actionExecution: {
    actionOutcomes: IActionExecution;
  };
}

export interface IExecutionLogAggOptions {
  numExecutions: number;
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: estypes.SortOrder;
}

const ExecutionLogSortFields: Record<string, string> = {
  timestamp: 'ruleExecution>executeStartTime',
  duration: 'ruleExecution>executionDuration',
};

export function getExecutionLogAggregation({
  numExecutions,
  page,
  perPage,
  sortField,
  sortOrder,
}: IExecutionLogAggOptions) {
  // Check if valid sort field
  if (!Object.keys(ExecutionLogSortFields).includes(sortField)) {
    throw Boom.badRequest(
      `Invalid sort field "${sortField}" - must be one of [${Object.keys(
        ExecutionLogSortFields
      ).join(',')}]`
    );
  }

  // Check if valid page value
  if (page <= 0) {
    throw Boom.badRequest(`Invalid page field "${page}" - must be greater than 0`);
  }

  return {
    // Get total number of executions
    executionUuidCardinality: {
      cardinality: {
        field: EXECUTION_UUID_FIELD,
      },
    },
    executionUuid: {
      // Bucket by execution UUID
      terms: {
        field: EXECUTION_UUID_FIELD,
        size: numExecutions,
      },
      aggs: {
        // Bucket sort to allow paging through executions
        executionUuidSorted: {
          bucket_sort: {
            sort: [
              {
                [ExecutionLogSortFields[sortField]]: {
                  order: sortOrder,
                },
              },
            ],
            from: (page - 1) * perPage,
            size: perPage,
          },
        },
        // Get counts for types of alerts and whether there was an execution timeout
        alertCounts: {
          filters: {
            filters: {
              newAlerts: { match: { [ACTION_FIELD]: 'new-instance' } },
              activeAlerts: { match: { [ACTION_FIELD]: 'active-instance' } },
              recoveredAlerts: { match: { [ACTION_FIELD]: 'recovered-instance' } },
            },
          },
        },
        // Filter by action execute doc and get information from this event
        actionExecution: {
          filter: getProviderAndActionFilter('actions', 'execute'),
          aggs: {
            actionOutcomes: {
              terms: {
                field: OUTCOME_FIELD,
                size: 2,
              },
            },
          },
        },
        // Filter by rule execute doc and get information from this event
        ruleExecution: {
          filter: getProviderAndActionFilter('alerting', 'execute'),
          aggs: {
            executeStartTime: {
              min: {
                field: START_FIELD,
              },
            },
            totalSearchDuration: {
              max: {
                field: TOTAL_SEARCH_DURATION_FIELD,
              },
            },
            esSearchDuration: {
              max: {
                field: ES_SEARCH_DURATION_FIELD,
              },
            },
            numTriggeredActions: {
              max: {
                field: NUMBER_OF_TRIGGERED_ACTIONS_FIELD,
              },
            },
            executionDuration: {
              max: {
                field: DURATION_FIELD,
              },
            },
            outcomeAndMessage: {
              top_hits: {
                size: 1,
                _source: {
                  includes: [OUTCOME_FIELD, MESSAGE_FIELD],
                },
              },
            },
          },
        },
        // If there was a timeout, this filter will return non-zero
        timeoutMessage: {
          filter: getProviderAndActionFilter('alerting', 'execute-timeout'),
        },
      },
    },
  };
}

function getProviderAndActionFilter(provider: string, action: string) {
  return {
    bool: {
      must: [
        {
          match: {
            [ACTION_FIELD]: action,
          },
        },
        {
          match: {
            [PROVIDER_FIELD]: provider,
          },
        },
      ],
    },
  };
}

export function formatExecutionLogAggBucket(bucketVal: IBucketAggregationResult): IExecutionLog {
  const durationUs = bucketVal.ruleExecution.executionDuration.value
    ? bucketVal.ruleExecution.executionDuration.value
    : 0;
  const timedOut = bucketVal.timeoutMessage.doc_count > 0;

  const actionExecutionOutcomes = bucketVal.actionExecution.actionOutcomes.buckets;
  const actionExecutionSuccess =
    actionExecutionOutcomes.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
  const actionExecutionError =
    actionExecutionOutcomes.find((bucket) => bucket.key === 'failure')?.doc_count ?? 0;
  return {
    id: bucketVal.key,
    timestamp: bucketVal.ruleExecution.executeStartTime.value_as_string!,
    duration_ms: durationUs / Millis2Nanos,
    status: bucketVal.ruleExecution.outcomeAndMessage.hits.hits[0]?._source?.event?.outcome,
    message: bucketVal.ruleExecution.outcomeAndMessage.hits.hits[0]?._source?.message,
    num_active_alerts: bucketVal.alertCounts.buckets.activeAlerts.doc_count,
    num_new_alerts: bucketVal.alertCounts.buckets.newAlerts.doc_count,
    num_recovered_alerts: bucketVal.alertCounts.buckets.recoveredAlerts.doc_count,
    num_triggered_actions: bucketVal.ruleExecution.numTriggeredActions.value ?? 0,
    num_succeeded_actions: actionExecutionSuccess,
    num_errored_actions: actionExecutionError,
    total_search_duration_ms: bucketVal.ruleExecution.totalSearchDuration.value ?? 0,
    es_search_duration_ms: bucketVal.ruleExecution.esSearchDuration.value ?? 0,
    timed_out: timedOut,
  };
}

export function formatExecutionLogResult(results: AggregateEventsBySavedObjectResult) {
  const { aggregations } = results;

  if (!aggregations) {
    return {
      total: 0,
      data: [],
    };
  }

  const total = (aggregations.executionUuidCardinality as estypes.AggregationsCardinalityAggregate)
    .value;
  const buckets = (
    aggregations.executionUuid as estypes.AggregationsMultiBucketAggregateBase<IBucketAggregationResult>
  ).buckets as IBucketAggregationResult[];

  return {
    total,
    data: buckets.map((bucket: IBucketAggregationResult) => formatExecutionLogAggBucket(bucket)),
  };
}
