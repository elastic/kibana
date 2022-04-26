/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { flatMap, get } from 'lodash';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { AggregateRuleExecutionEvent } from '../../../../../../common/detection_engine/schemas/common';
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../../common/detection_engine/schemas/response';
import {
  ExecutionEventAggregationOptions,
  ExecutionUuidAggResult,
  ExecutionUuidAggBucket,
  EXECUTION_UUID_FIELD,
} from './types';

// Base ECS fields
const ACTION_FIELD = 'event.action';
const DURATION_FIELD = 'event.duration';
const MESSAGE_FIELD = 'message';
const PROVIDER_FIELD = 'event.provider';
const OUTCOME_FIELD = 'event.outcome';
const START_FIELD = 'event.start';
const TIMESTAMP_FIELD = '@timestamp';
// Platform fields
const SCHEDULE_DELAY_FIELD = 'kibana.task.schedule_delay';
const ES_SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.es_search_duration_ms';
const TOTAL_ACTIONS_TRIGGERED_FIELD =
  'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
// TODO: To be added in https://github.com/elastic/kibana/pull/126210
// const TOTAL_ALERTS_CREATED: 'kibana.alert.rule.execution.metrics.total_alerts_created',
// const TOTAL_ALERTS_DETECTED: 'kibana.alert.rule.execution.metrics.total_alerts_detected',
// Security fields
const GAP_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.execution_gap_duration_s';
const INDEXING_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms';
const SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.total_search_duration_ms';
const STATUS_FIELD = 'kibana.alert.rule.execution.status';

const ONE_MILLISECOND_AS_NANOSECONDS = 1_000_000;

const SORT_FIELD_TO_AGG_MAPPING: Record<string, string> = {
  timestamp: 'ruleExecution>executeStartTime',
  duration_ms: 'ruleExecution>executionDuration',
  indexing_duration_ms: 'securityMetrics>indexDuration',
  search_duration_ms: 'securityMetrics>searchDuration',
  gap_duration_ms: 'securityMetrics>gapDuration',
  schedule_delay_ms: 'ruleExecution>scheduleDelay',
  num_triggered_actions: 'ruleExecution>numTriggeredActions',
  // TODO: To be added in https://github.com/elastic/kibana/pull/126210
  // total_alerts_created: 'securityMetrics>totalAlertsDetected',
  // total_alerts_detected: 'securityMetrics>totalAlertsCreated',
};

/**
 * Returns `aggs` to be supplied to aggregateEventsBySavedObjectIds
 * @param maxExecutions upper bounds of execution events to return (to narrow below max terms agg limit)
 * @param page current page to retrieve, starting at 0
 * @param perPage number of execution events to display per page
 * @param sort field to sort on
 */
export const getExecutionEventAggregation = ({
  maxExecutions,
  page,
  perPage,
  sort,
}: ExecutionEventAggregationOptions): Record<string, estypes.AggregationsAggregationContainer> => {
  // Last stop validation for any other consumers so there's a friendly message instead of failed ES Query
  if (maxExecutions > MAX_EXECUTION_EVENTS_DISPLAYED) {
    throw new BadRequestError(
      `Invalid maxExecutions requested "${maxExecutions}" - must be less than ${MAX_EXECUTION_EVENTS_DISPLAYED}`
    );
  }

  if (page <= 0) {
    throw new BadRequestError(`Invalid page field "${page}" - must be greater than 0`);
  }

  if (perPage <= 0) {
    throw new BadRequestError(`Invalid perPage field "${perPage}" - must be greater than 0`);
  }

  const sortFields = flatMap(sort as estypes.SortCombinations[], (s) => Object.keys(s));
  for (const field of sortFields) {
    if (!Object.keys(SORT_FIELD_TO_AGG_MAPPING).includes(field)) {
      throw new BadRequestError(
        `Invalid sort field "${field}" - must be one of [${Object.keys(
          SORT_FIELD_TO_AGG_MAPPING
        ).join(',')}]`
      );
    }
  }

  return {
    // Total unique executions for given root filters
    totalExecutions: {
      cardinality: {
        field: EXECUTION_UUID_FIELD,
      },
    },
    executionUuid: {
      // Bucket by execution UUID
      terms: {
        field: EXECUTION_UUID_FIELD,
        size: maxExecutions,
        order: formatSortForTermsSort(sort),
      },
      aggs: {
        // Bucket sort for paging
        executionUuidSorted: {
          bucket_sort: {
            sort: formatSortForBucketSort(sort),
            from: (page - 1) * perPage,
            size: perPage,
            // Must override gap_policy to not miss fields/docs, for details see: https://github.com/elastic/kibana/pull/127339/files#r825240516
            gap_policy: 'insert_zeros',
          },
        },
        // Filter by action execute doc to retrieve action outcomes (successful/failed)
        actionExecution: {
          filter: getProviderAndActionFilter('actions', 'execute'),
          aggs: {
            actionOutcomes: {
              terms: {
                field: OUTCOME_FIELD,
                // Size is 2 here as outcomes we're collating are `success` & `failed`
                size: 2,
              },
            },
          },
        },
        // Filter by alerting execute doc to retrieve platform metrics
        ruleExecution: {
          filter: getProviderAndActionFilter('alerting', 'execute'),
          aggs: {
            executeStartTime: {
              min: {
                field: START_FIELD,
              },
            },
            scheduleDelay: {
              max: {
                field: SCHEDULE_DELAY_FIELD,
              },
            },
            esSearchDuration: {
              max: {
                field: ES_SEARCH_DURATION_FIELD,
              },
            },
            numTriggeredActions: {
              max: {
                field: TOTAL_ACTIONS_TRIGGERED_FIELD,
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
        // Filter by securitySolution status-change doc to retrieve security metrics
        securityMetrics: {
          filter: getProviderAndActionFilter('securitySolution.ruleExecution', 'execution-metrics'),
          aggs: {
            gapDuration: {
              min: {
                field: GAP_DURATION_FIELD,
                missing: 0, // Necessary for sorting since field isn't written if no gap
              },
            },
            indexDuration: {
              min: {
                field: INDEXING_DURATION_FIELD,
              },
            },
            searchDuration: {
              min: {
                field: SEARCH_DURATION_FIELD,
              },
            },
          },
        },
        // Filter by securitySolution ruleExecution doc to retrieve status and message
        securityStatus: {
          filter: getProviderAndActionFilter('securitySolution.ruleExecution', 'status-change'),
          aggs: {
            status: {
              top_hits: {
                sort: {
                  [TIMESTAMP_FIELD]: {
                    order: 'desc',
                  },
                },
                size: 1,
                _source: {
                  includes: STATUS_FIELD,
                },
              },
            },
            message: {
              top_hits: {
                size: 1,
                sort: {
                  [TIMESTAMP_FIELD]: {
                    order: 'desc',
                  },
                },
                _source: {
                  includes: MESSAGE_FIELD,
                },
              },
            },
          },
        },
        // If there was a timeout, this filter will return non-zero doc count
        timeoutMessage: {
          filter: getProviderAndActionFilter('alerting', 'execute-timeout'),
        },
      },
    },
  };
};

/**
 * Returns bool filter for matching a specific provider AND action combination
 * @param provider provider to match
 * @param action action to match
 */
export const getProviderAndActionFilter = (provider: string, action: string) => {
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
};

/**
 * Formats aggregate execution event from bucket response
 * @param bucket
 */
export const formatAggExecutionEventFromBucket = (
  bucket: ExecutionUuidAggBucket
): AggregateRuleExecutionEvent => {
  const durationUs = bucket?.ruleExecution?.executionDuration?.value ?? 0;
  const scheduleDelayUs = bucket?.ruleExecution?.scheduleDelay?.value ?? 0;
  const timedOut = (bucket?.timeoutMessage?.doc_count ?? 0) > 0;

  const actionOutcomes = bucket?.actionExecution?.actionOutcomes?.buckets ?? [];
  const actionExecutionSuccess = actionOutcomes.find((b) => b?.key === 'success')?.doc_count ?? 0;
  const actionExecutionError = actionOutcomes.find((b) => b?.key === 'failure')?.doc_count ?? 0;

  return {
    execution_uuid: bucket?.key ?? '',
    timestamp: bucket?.ruleExecution?.executeStartTime.value_as_string ?? '',
    duration_ms: durationUs / ONE_MILLISECOND_AS_NANOSECONDS,
    status: bucket?.ruleExecution?.outcomeAndMessage?.hits?.hits[0]?._source?.event?.outcome,
    message: bucket?.ruleExecution?.outcomeAndMessage?.hits?.hits[0]?._source?.message,
    num_active_alerts: bucket?.alertCounts?.buckets?.activeAlerts?.doc_count ?? 0,
    num_new_alerts: bucket?.alertCounts?.buckets?.newAlerts?.doc_count ?? 0,
    num_recovered_alerts: bucket?.alertCounts?.buckets?.recoveredAlerts?.doc_count ?? 0,
    num_triggered_actions: bucket?.ruleExecution?.numTriggeredActions?.value ?? 0,
    num_succeeded_actions: actionExecutionSuccess,
    num_errored_actions: actionExecutionError,
    total_search_duration_ms: bucket?.ruleExecution?.totalSearchDuration?.value ?? 0,
    es_search_duration_ms: bucket?.ruleExecution?.esSearchDuration?.value ?? 0,
    schedule_delay_ms: scheduleDelayUs / ONE_MILLISECOND_AS_NANOSECONDS,
    timed_out: timedOut,
    // security fields
    indexing_duration_ms: bucket?.securityMetrics?.indexDuration?.value ?? 0,
    search_duration_ms: bucket?.securityMetrics?.searchDuration?.value ?? 0,
    gap_duration_ms: bucket?.securityMetrics?.gapDuration?.value ?? 0,
    security_status:
      bucket?.securityStatus?.status?.hits?.hits[0]?._source?.kibana?.alert?.rule?.execution
        ?.status,
    security_message: bucket?.securityStatus?.message?.hits?.hits[0]?._source?.message,
  };
};

/**
 * Formats getAggregateExecutionEvents response from Elasticsearch response
 * @param results Elasticsearch response
 * @param totalExecutions total number of executions to override from initial statusFilter query
 */
export const formatExecutionEventResponse = (
  results: AggregateEventsBySavedObjectResult,
  totalExecutions?: number
): GetAggregateRuleExecutionEventsResponse => {
  const { aggregations } = results;

  if (!aggregations) {
    return {
      total: 0,
      events: [],
    };
  }

  const total = (aggregations.totalExecutions as estypes.AggregationsCardinalityAggregate).value;
  const buckets = (aggregations.executionUuid as ExecutionUuidAggResult).buckets;

  return {
    total: totalExecutions ? totalExecutions : total,
    events: buckets.map((b: ExecutionUuidAggBucket) => formatAggExecutionEventFromBucket(b)),
  };
};

/**
 * Formats sort field into bucket_sort agg format
 * @param sort
 */
export const formatSortForBucketSort = (sort: estypes.Sort) => {
  return (sort as estypes.SortCombinations[]).map((s) =>
    Object.keys(s).reduce(
      (acc, curr) => ({ ...acc, [SORT_FIELD_TO_AGG_MAPPING[curr]]: get(s, curr) }),
      {}
    )
  );
};

/**
 * Formats sort field into terms agg format
 * @param sort
 */
export const formatSortForTermsSort = (sort: estypes.Sort) => {
  return (sort as estypes.SortCombinations[]).map((s) =>
    Object.keys(s).reduce(
      (acc, curr) => ({ ...acc, [SORT_FIELD_TO_AGG_MAPPING[curr]]: get(s, `${curr}.order`) }),
      {}
    )
  );
};
