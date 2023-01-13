/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import Boom from '@hapi/boom';
import { flatMap, get, isEmpty } from 'lodash';
import { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { IExecutionLog, IExecutionLogResult, EMPTY_EXECUTION_KPI_RESULT } from '../../common';

const DEFAULT_MAX_BUCKETS_LIMIT = 1000; // do not retrieve more than this number of executions
const DEFAULT_MAX_KPI_BUCKETS_LIMIT = 10000;

const SPACE_ID_FIELD = 'kibana.space_ids';
const ACTION_NAME_FIELD = 'kibana.action.name';
const START_FIELD = 'event.start';
const ACTION_FIELD = 'event.action';
const OUTCOME_FIELD = 'event.outcome';
const DURATION_FIELD = 'event.duration';
const MESSAGE_FIELD = 'message';
const VERSION_FIELD = 'kibana.version';
const ERROR_MESSAGE_FIELD = 'error.message';
const SCHEDULE_DELAY_FIELD = 'kibana.task.schedule_delay';
const EXECUTION_UUID_FIELD = 'kibana.action.execution.uuid';

const Millis2Nanos = 1000 * 1000;

export const ACTION_FILTER = 'event.provider: actions AND NOT event.action: execute-start';
export const EMPTY_EXECUTION_LOG_RESULT = {
  total: 0,
  data: [],
};

interface IActionExecution
  extends estypes.AggregationsTermsAggregateBase<{ key: string; doc_count: number }> {
  buckets: Array<{ key: string; doc_count: number }>;
}

interface IExecutionUuidKpiAggBucket extends estypes.AggregationsStringTermsBucketKeys {
  actionExecution: {
    doc_count: number;
    numTriggeredActions: estypes.AggregationsSumAggregate;
    numGeneratedActions: estypes.AggregationsSumAggregate;
    numActiveAlerts: estypes.AggregationsSumAggregate;
    numRecoveredAlerts: estypes.AggregationsSumAggregate;
    numNewAlerts: estypes.AggregationsSumAggregate;
    actionExecutionOutcomes: IActionExecution;
  };
}
interface IExecutionUuidAggBucket extends estypes.AggregationsStringTermsBucketKeys {
  timeoutMessage: estypes.AggregationsMultiBucketBase;
  actionExecution: {
    executeStartTime: estypes.AggregationsMinAggregate;
    executionDuration: estypes.AggregationsMaxAggregate;
    scheduleDelay: estypes.AggregationsMaxAggregate;
    outcomeAndMessage: estypes.AggregationsTopHitsAggregate;
  };
}

export interface ExecutionUuidAggResult extends estypes.AggregationsAggregateBase {
  buckets: IExecutionUuidAggBucket[];
}

export interface ExecutionUuidKPIAggResult extends estypes.AggregationsAggregateBase {
  buckets: IExecutionUuidKpiAggBucket[];
}

interface ExecutionLogAggResult extends estypes.AggregationsAggregateBase {
  executionUuid: ExecutionUuidAggResult;
  executionUuidCardinality: {
    executionUuidCardinality: estypes.AggregationsCardinalityAggregate;
  };
}

interface ExecutionKpiAggResult extends estypes.AggregationsAggregateBase {
  executionUuid: ExecutionUuidKPIAggResult;
}

export interface IExecutionLogAggOptions {
  filter?: string | KueryNode;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

const ExecutionLogSortFields: Record<string, string> = {
  timestamp: 'actionExecution>executeStartTime',
  execution_duration: 'actionExecution>executionDuration',
  schedule_delay: 'actionExecution>scheduleDelay',
};

export const getExecutionKPIAggregation = (filter?: IExecutionLogAggOptions['filter']) => {
  const dslFilterQuery: estypes.QueryDslBoolQuery['filter'] = buildDslFilterQuery(filter);

  return {
    executionKpiAgg: {
      ...(dslFilterQuery ? { filter: { bool: { filter: dslFilterQuery } } } : {}),
      aggs: {
        executionUuid: {
          // Bucket by execution UUID
          terms: {
            field: EXECUTION_UUID_FIELD,
            size: DEFAULT_MAX_KPI_BUCKETS_LIMIT,
            order: formatSortForTermSort([{ timestamp: { order: 'desc' } }]),
          },
          aggs: {
            executionUuidSorted: {
              bucket_sort: {
                from: 0,
                size: DEFAULT_MAX_KPI_BUCKETS_LIMIT,
                gap_policy: 'insert_zeros' as estypes.AggregationsGapPolicy,
              },
            },
            actionExecution: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        [ACTION_FIELD]: 'execute',
                      },
                    },
                  ],
                },
              },
              aggs: {
                executeStartTime: {
                  min: {
                    field: START_FIELD,
                  },
                },
                actionExecutionOutcomes: {
                  terms: {
                    size: 3,
                    field: OUTCOME_FIELD,
                  },
                },
              },
            },
            minExecutionUuidBucket: {
              bucket_selector: {
                buckets_path: {
                  count: 'actionExecution._count',
                },
                script: {
                  source: 'params.count > 0',
                },
              },
            },
          },
        },
      },
    },
  };
};

export function getExecutionLogAggregation({
  filter,
  page,
  perPage,
  sort,
}: IExecutionLogAggOptions) {
  // Check if valid sort fields
  const sortFields = flatMap(sort as estypes.SortCombinations[], (s) => Object.keys(s));
  for (const field of sortFields) {
    if (!Object.keys(ExecutionLogSortFields).includes(field)) {
      throw Boom.badRequest(
        `Invalid sort field "${field}" - must be one of [${Object.keys(ExecutionLogSortFields).join(
          ','
        )}]`
      );
    }
  }

  // Check if valid page value
  if (page <= 0) {
    throw Boom.badRequest(`Invalid page field "${page}" - must be greater than 0`);
  }

  // Check if valid page value
  if (perPage <= 0) {
    throw Boom.badRequest(`Invalid perPage field "${perPage}" - must be greater than 0`);
  }

  const dslFilterQuery: estypes.QueryDslBoolQuery['filter'] = buildDslFilterQuery(filter);

  return {
    executionLogAgg: {
      ...(dslFilterQuery ? { filter: { bool: { filter: dslFilterQuery } } } : {}),
      aggs: {
        // Get total number of executions
        executionUuidCardinality: {
          filter: {
            bool: {
              must: [
                {
                  match: {
                    [ACTION_FIELD]: 'execute',
                  },
                },
              ],
            },
          },
          aggs: {
            executionUuidCardinality: {
              cardinality: {
                field: EXECUTION_UUID_FIELD,
              },
            },
          },
        },
        executionUuid: {
          // Bucket by execution UUID
          terms: {
            field: EXECUTION_UUID_FIELD,
            size: DEFAULT_MAX_BUCKETS_LIMIT,
            order: formatSortForTermSort(sort),
          },
          aggs: {
            // Bucket sort to allow paging through executions
            executionUuidSorted: {
              bucket_sort: {
                sort: formatSortForBucketSort(sort),
                from: (page - 1) * perPage,
                size: perPage,
                gap_policy: 'insert_zeros' as estypes.AggregationsGapPolicy,
              },
            },
            // Filter by action execute doc and get information from this event
            actionExecution: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        [ACTION_FIELD]: 'execute',
                      },
                    },
                  ],
                },
              },
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
                executionDuration: {
                  max: {
                    field: DURATION_FIELD,
                  },
                },
                outcomeAndMessage: {
                  top_hits: {
                    _source: {
                      includes: [
                        OUTCOME_FIELD,
                        MESSAGE_FIELD,
                        ERROR_MESSAGE_FIELD,
                        VERSION_FIELD,
                        SPACE_ID_FIELD,
                        ACTION_NAME_FIELD,
                      ],
                    },
                  },
                },
              },
            },
            // If there was a timeout, this filter will return non-zero doc count
            timeoutMessage: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        [ACTION_FIELD]: 'execute-timeout',
                      },
                    },
                  ],
                },
              },
            },
            // Filter out execution UUID buckets where actionExecution doc count is 0
            minExecutionUuidBucket: {
              bucket_selector: {
                buckets_path: {
                  count: 'actionExecution._count',
                },
                script: {
                  source: 'params.count > 0',
                },
              },
            },
          },
        },
      },
    },
  };
}

function buildDslFilterQuery(filter: IExecutionLogAggOptions['filter']) {
  try {
    const filterKueryNode = typeof filter === 'string' ? fromKueryExpression(filter) : filter;
    return filterKueryNode ? toElasticsearchQuery(filterKueryNode) : undefined;
  } catch (err) {
    throw Boom.badRequest(`Invalid kuery syntax for filter ${filter}`);
  }
}

function formatExecutionLogAggBucket(bucket: IExecutionUuidAggBucket): IExecutionLog {
  const durationUs = bucket?.actionExecution?.executionDuration?.value
    ? bucket.actionExecution.executionDuration.value
    : 0;
  const scheduleDelayUs = bucket?.actionExecution?.scheduleDelay?.value
    ? bucket.actionExecution.scheduleDelay.value
    : 0;

  const outcomeAndMessage =
    bucket?.actionExecution?.outcomeAndMessage?.hits?.hits[0]?._source ?? {};
  let status = outcomeAndMessage.kibana?.alerting?.outcome ?? '';
  if (isEmpty(status)) {
    status = outcomeAndMessage.event?.outcome ?? '';
  }
  const outcomeMessage = outcomeAndMessage.message ?? '';
  const outcomeErrorMessage = outcomeAndMessage.error?.message ?? '';
  const message =
    status === 'failure' ? `${outcomeMessage} - ${outcomeErrorMessage}` : outcomeMessage;
  const version = outcomeAndMessage.kibana?.version ?? '';

  const spaceIds = outcomeAndMessage ? outcomeAndMessage?.kibana?.space_ids ?? [] : [];
  const actionName = outcomeAndMessage ? outcomeAndMessage?.kibana.action?.name ?? '' : '';
  const timedOut = (bucket?.timeoutMessage?.doc_count ?? 0) > 0;
  return {
    id: bucket?.key ?? '',
    timestamp: bucket?.actionExecution?.executeStartTime.value_as_string ?? '',
    duration_ms: durationUs / Millis2Nanos,
    status,
    message,
    version,
    schedule_delay_ms: scheduleDelayUs / Millis2Nanos,
    space_ids: spaceIds,
    connector_name: actionName,
    timed_out: timedOut,
  };
}

function formatExecutionKPIAggBuckets(buckets: IExecutionUuidKpiAggBucket[]) {
  const objToReturn = {
    success: 0,
    unknown: 0,
    failure: 0,
    warning: 0,
  };

  buckets.forEach((bucket) => {
    const actionExecutionOutcomes = bucket?.actionExecution?.actionExecutionOutcomes?.buckets ?? [];

    const actionExecutionCount = bucket?.actionExecution?.doc_count ?? 0;
    const outcomes = {
      successActionExecution: 0,
      failureActionExecution: 0,
      warningActionExecution: 0,
    };
    actionExecutionOutcomes.reduce((acc, subBucket) => {
      const key = subBucket.key;

      if (key === 'success') {
        acc.successActionExecution = subBucket.doc_count ?? 0;
      } else if (key === 'failure') {
        acc.failureActionExecution = subBucket.doc_count ?? 0;
      } else if (key === 'warning') {
        acc.warningActionExecution = subBucket.doc_count ?? 0;
      }
      return acc;
    }, outcomes);

    objToReturn.success += outcomes.successActionExecution;
    objToReturn.unknown +=
      actionExecutionCount -
      (outcomes.successActionExecution +
        outcomes.failureActionExecution +
        outcomes.warningActionExecution);
    objToReturn.failure += outcomes.failureActionExecution;
    objToReturn.warning += outcomes.warningActionExecution;
  });

  return objToReturn;
}

export function formatExecutionKPIResult(results: AggregateEventsBySavedObjectResult) {
  const { aggregations } = results;
  if (!aggregations || !aggregations.executionKpiAgg) {
    return EMPTY_EXECUTION_KPI_RESULT;
  }
  const aggs = aggregations.executionKpiAgg as ExecutionKpiAggResult;
  const buckets = aggs.executionUuid.buckets;
  return formatExecutionKPIAggBuckets(buckets);
}

export function formatExecutionLogResult(
  results: AggregateEventsBySavedObjectResult
): IExecutionLogResult {
  const { aggregations } = results;

  if (!aggregations || !aggregations.executionLogAgg) {
    return EMPTY_EXECUTION_LOG_RESULT;
  }

  const aggs = aggregations.executionLogAgg as ExecutionLogAggResult;

  const total = aggs.executionUuidCardinality.executionUuidCardinality.value;
  const buckets = aggs.executionUuid.buckets;

  return {
    total,
    data: buckets.map((bucket: IExecutionUuidAggBucket) => formatExecutionLogAggBucket(bucket)),
  };
}

export function formatSortForBucketSort(sort: estypes.Sort) {
  return (sort as estypes.SortCombinations[]).map((s) =>
    Object.keys(s).reduce(
      (acc, curr) => ({ ...acc, [ExecutionLogSortFields[curr]]: get(s, curr) }),
      {}
    )
  );
}

export function formatSortForTermSort(sort: estypes.Sort) {
  return (sort as estypes.SortCombinations[]).map((s) =>
    Object.keys(s).reduce(
      (acc, curr) => ({ ...acc, [ExecutionLogSortFields[curr]]: get(s, `${curr}.order`) }),
      {}
    )
  );
}
