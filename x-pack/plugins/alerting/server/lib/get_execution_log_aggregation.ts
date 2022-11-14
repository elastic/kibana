/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/core-saved-objects-api-server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import Boom from '@hapi/boom';
import { flatMap, get } from 'lodash';
import { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { parseDuration } from '.';
import { IExecutionLog, IExecutionLogResult, EMPTY_EXECUTION_KPI_RESULT } from '../../common';

const DEFAULT_MAX_BUCKETS_LIMIT = 1000; // do not retrieve more than this number of executions
const DEFAULT_MAX_KPI_BUCKETS_LIMIT = 10000;

const RULE_ID_FIELD = 'rule.id';
const RULE_NAME_FIELD = 'rule.name';
const PROVIDER_FIELD = 'event.provider';
const START_FIELD = 'event.start';
const ACTION_FIELD = 'event.action';
const OUTCOME_FIELD = 'event.outcome';
const DURATION_FIELD = 'event.duration';
const MESSAGE_FIELD = 'message';
const VERSION_FIELD = 'kibana.version';
const ERROR_MESSAGE_FIELD = 'error.message';
const SCHEDULE_DELAY_FIELD = 'kibana.task.schedule_delay';
const ES_SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.es_search_duration_ms';
const TOTAL_SEARCH_DURATION_FIELD = 'kibana.alert.rule.execution.metrics.total_search_duration_ms';
const NUMBER_OF_TRIGGERED_ACTIONS_FIELD =
  'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
const NUMBER_OF_GENERATED_ACTIONS_FIELD =
  'kibana.alert.rule.execution.metrics.number_of_generated_actions';
const NUMBER_OF_ACTIVE_ALERTS_FIELD = 'kibana.alert.rule.execution.metrics.alert_counts.active';
const NUMBER_OF_NEW_ALERTS_FIELD = 'kibana.alert.rule.execution.metrics.alert_counts.new';
const NUMBER_OF_RECOVERED_ALERTS_FIELD =
  'kibana.alert.rule.execution.metrics.alert_counts.recovered';
const EXECUTION_UUID_FIELD = 'kibana.alert.rule.execution.uuid';

const Millis2Nanos = 1000 * 1000;

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
    actionOutcomes: IActionExecution;
  };
  ruleExecution: {
    doc_count: number;
    numTriggeredActions: estypes.AggregationsSumAggregate;
    numGeneratedActions: estypes.AggregationsSumAggregate;
    numActiveAlerts: estypes.AggregationsSumAggregate;
    numRecoveredAlerts: estypes.AggregationsSumAggregate;
    numNewAlerts: estypes.AggregationsSumAggregate;
    ruleExecutionOutcomes: IActionExecution;
  };
}
interface IExecutionUuidAggBucket extends estypes.AggregationsStringTermsBucketKeys {
  timeoutMessage: estypes.AggregationsMultiBucketBase;
  ruleExecution: {
    executeStartTime: estypes.AggregationsMinAggregate;
    executionDuration: estypes.AggregationsMaxAggregate;
    scheduleDelay: estypes.AggregationsMaxAggregate;
    esSearchDuration: estypes.AggregationsMaxAggregate;
    totalSearchDuration: estypes.AggregationsMaxAggregate;
    numTriggeredActions: estypes.AggregationsMaxAggregate;
    numGeneratedActions: estypes.AggregationsMaxAggregate;
    numActiveAlerts: estypes.AggregationsMaxAggregate;
    numRecoveredAlerts: estypes.AggregationsMaxAggregate;
    numNewAlerts: estypes.AggregationsMaxAggregate;
    outcomeAndMessage: estypes.AggregationsTopHitsAggregate;
  };
  actionExecution: {
    actionOutcomes: IActionExecution;
  };
}

export interface ExecutionUuidAggResult<TBucket = IExecutionUuidAggBucket>
  extends estypes.AggregationsAggregateBase {
  buckets: TBucket[];
}

export interface ExecutionUuidKPIAggResult<TBucket = IExecutionUuidKpiAggBucket>
  extends estypes.AggregationsAggregateBase {
  buckets: TBucket[];
}

interface ExcludeExecuteStartAggResult extends estypes.AggregationsAggregateBase {
  executionUuid: ExecutionUuidAggResult;
  executionUuidCardinality: {
    executionUuidCardinality: estypes.AggregationsCardinalityAggregate;
  };
}

interface ExcludeExecuteStartKpiAggResult extends estypes.AggregationsAggregateBase {
  executionUuid: ExecutionUuidKPIAggResult;
}

export interface IExecutionLogAggOptions {
  filter?: string | KueryNode;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

const ExecutionLogSortFields: Record<string, string> = {
  timestamp: 'ruleExecution>executeStartTime',
  execution_duration: 'ruleExecution>executionDuration',
  total_search_duration: 'ruleExecution>totalSearchDuration',
  es_search_duration: 'ruleExecution>esSearchDuration',
  schedule_delay: 'ruleExecution>scheduleDelay',
  num_triggered_actions: 'ruleExecution>numTriggeredActions',
  num_generated_actions: 'ruleExecution>numGeneratedActions',
  num_active_alerts: 'ruleExecution>numActiveAlerts',
  num_recovered_alerts: 'ruleExecution>numRecoveredAlerts',
  num_new_alerts: 'ruleExecution>numNewAlerts',
};

export const getExecutionKPIAggregation = (filter?: IExecutionLogAggOptions['filter']) => {
  const dslFilterQuery: estypes.QueryDslBoolQuery['filter'] = buildDslFilterQuery(filter);

  return {
    excludeExecuteStart: {
      filter: {
        bool: {
          must_not: [
            {
              term: {
                'event.action': 'execute-start',
              },
            },
          ],
        },
      },
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
                  must: [getProviderAndActionFilter('actions', 'execute')],
                },
              },
              aggs: {
                actionOutcomes: {
                  terms: {
                    field: 'event.outcome',
                    size: 2,
                  },
                },
              },
            },
            ruleExecution: {
              filter: {
                bool: {
                  ...(dslFilterQuery ? { filter: dslFilterQuery } : {}),
                  must: [getProviderAndActionFilter('alerting', 'execute')],
                },
              },
              aggs: {
                executeStartTime: {
                  min: {
                    field: START_FIELD,
                  },
                },
                numTriggeredActions: {
                  sum: {
                    field: 'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
                    missing: 0,
                  },
                },
                numGeneratedActions: {
                  sum: {
                    field: 'kibana.alert.rule.execution.metrics.number_of_generated_actions',
                    missing: 0,
                  },
                },
                numActiveAlerts: {
                  sum: {
                    field: 'kibana.alert.rule.execution.metrics.alert_counts.active',
                    missing: 0,
                  },
                },
                numRecoveredAlerts: {
                  sum: {
                    field: 'kibana.alert.rule.execution.metrics.alert_counts.recovered',
                    missing: 0,
                  },
                },
                numNewAlerts: {
                  sum: {
                    field: 'kibana.alert.rule.execution.metrics.alert_counts.new',
                    missing: 0,
                  },
                },
                ruleExecutionOutcomes: {
                  terms: {
                    field: 'event.outcome',
                    size: 2,
                  },
                },
              },
            },
            minExecutionUuidBucket: {
              bucket_selector: {
                buckets_path: {
                  count: 'ruleExecution._count',
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
    excludeExecuteStart: {
      filter: {
        bool: {
          must_not: [
            {
              term: {
                [ACTION_FIELD]: 'execute-start',
              },
            },
          ],
        },
      },
      aggs: {
        // Get total number of executions
        executionUuidCardinality: {
          filter: {
            bool: {
              ...(dslFilterQuery ? { filter: dslFilterQuery } : {}),
              must: [getProviderAndActionFilter('alerting', 'execute')],
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
              filter: {
                bool: {
                  ...(dslFilterQuery ? { filter: dslFilterQuery } : {}),
                  must: [getProviderAndActionFilter('alerting', 'execute')],
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
                numGeneratedActions: {
                  max: {
                    field: NUMBER_OF_GENERATED_ACTIONS_FIELD,
                  },
                },
                numActiveAlerts: {
                  max: {
                    field: NUMBER_OF_ACTIVE_ALERTS_FIELD,
                  },
                },
                numRecoveredAlerts: {
                  max: {
                    field: NUMBER_OF_RECOVERED_ALERTS_FIELD,
                  },
                },
                numNewAlerts: {
                  max: {
                    field: NUMBER_OF_NEW_ALERTS_FIELD,
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
                      includes: [
                        OUTCOME_FIELD,
                        MESSAGE_FIELD,
                        ERROR_MESSAGE_FIELD,
                        VERSION_FIELD,
                        RULE_ID_FIELD,
                        RULE_NAME_FIELD,
                      ],
                    },
                  },
                },
              },
            },
            // If there was a timeout, this filter will return non-zero doc count
            timeoutMessage: {
              filter: getProviderAndActionFilter('alerting', 'execute-timeout'),
            },
            // Filter out execution UUID buckets where ruleExecution doc count is 0
            minExecutionUuidBucket: {
              bucket_selector: {
                buckets_path: {
                  count: 'ruleExecution._count',
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
    return filter ? toElasticsearchQuery(filterKueryNode) : undefined;
  } catch (err) {
    throw Boom.badRequest(`Invalid kuery syntax for filter ${filter}`);
  }
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

function formatExecutionLogAggBucket(bucket: IExecutionUuidAggBucket): IExecutionLog {
  const durationUs = bucket?.ruleExecution?.executionDuration?.value
    ? bucket.ruleExecution.executionDuration.value
    : 0;
  const scheduleDelayUs = bucket?.ruleExecution?.scheduleDelay?.value
    ? bucket.ruleExecution.scheduleDelay.value
    : 0;
  const timedOut = (bucket?.timeoutMessage?.doc_count ?? 0) > 0;

  const actionExecutionOutcomes = bucket?.actionExecution?.actionOutcomes?.buckets ?? [];
  const actionExecutionSuccess =
    actionExecutionOutcomes.find((subBucket) => subBucket?.key === 'success')?.doc_count ?? 0;
  const actionExecutionError =
    actionExecutionOutcomes.find((subBucket) => subBucket?.key === 'failure')?.doc_count ?? 0;

  const outcomeAndMessage = bucket?.ruleExecution?.outcomeAndMessage?.hits?.hits[0]?._source;
  const status = outcomeAndMessage ? outcomeAndMessage?.event?.outcome ?? '' : '';
  const message =
    status === 'failure'
      ? `${outcomeAndMessage?.message ?? ''} - ${outcomeAndMessage?.error?.message ?? ''}`
      : outcomeAndMessage?.message ?? '';
  const version = outcomeAndMessage ? outcomeAndMessage?.kibana?.version ?? '' : '';

  const ruleId = outcomeAndMessage ? outcomeAndMessage?.rule?.id ?? '' : '';
  const ruleName = outcomeAndMessage ? outcomeAndMessage?.rule?.name ?? '' : '';
  return {
    id: bucket?.key ?? '',
    timestamp: bucket?.ruleExecution?.executeStartTime.value_as_string ?? '',
    duration_ms: durationUs / Millis2Nanos,
    status,
    message,
    version,
    num_active_alerts: bucket?.ruleExecution?.numActiveAlerts?.value ?? 0,
    num_new_alerts: bucket?.ruleExecution?.numNewAlerts?.value ?? 0,
    num_recovered_alerts: bucket?.ruleExecution?.numRecoveredAlerts?.value ?? 0,
    num_triggered_actions: bucket?.ruleExecution?.numTriggeredActions?.value ?? 0,
    num_generated_actions: bucket?.ruleExecution?.numGeneratedActions?.value ?? 0,
    num_succeeded_actions: actionExecutionSuccess,
    num_errored_actions: actionExecutionError,
    total_search_duration_ms: bucket?.ruleExecution?.totalSearchDuration?.value ?? 0,
    es_search_duration_ms: bucket?.ruleExecution?.esSearchDuration?.value ?? 0,
    schedule_delay_ms: scheduleDelayUs / Millis2Nanos,
    timed_out: timedOut,
    rule_id: ruleId,
    rule_name: ruleName,
  };
}

function formatExecutionKPIAggBuckets(buckets: IExecutionUuidKpiAggBucket[]) {
  const objToReturn = {
    success: 0,
    unknown: 0,
    failure: 0,
    activeAlerts: 0,
    newAlerts: 0,
    recoveredAlerts: 0,
    erroredActions: 0,
    triggeredActions: 0,
  };

  buckets.forEach((bucket) => {
    const ruleExecutionOutcomes = bucket?.ruleExecution?.ruleExecutionOutcomes?.buckets ?? [];
    const actionExecutionOutcomes = bucket?.actionExecution?.actionOutcomes?.buckets ?? [];

    const ruleExecutionCount = bucket?.ruleExecution?.doc_count ?? 0;
    const successRuleExecution =
      ruleExecutionOutcomes.find((subBucket) => subBucket?.key === 'success')?.doc_count ?? 0;
    const failureRuleExecution =
      ruleExecutionOutcomes.find((subBucket) => subBucket?.key === 'failure')?.doc_count ?? 0;

    objToReturn.success += successRuleExecution;
    objToReturn.unknown += ruleExecutionCount - (successRuleExecution + failureRuleExecution);
    objToReturn.failure += failureRuleExecution;
    objToReturn.activeAlerts += bucket?.ruleExecution?.numActiveAlerts.value ?? 0;
    objToReturn.newAlerts += bucket?.ruleExecution?.numNewAlerts.value ?? 0;
    objToReturn.recoveredAlerts += bucket?.ruleExecution?.numRecoveredAlerts.value ?? 0;
    objToReturn.erroredActions +=
      actionExecutionOutcomes.find((subBucket) => subBucket?.key === 'failure')?.doc_count ?? 0;
    objToReturn.triggeredActions += bucket?.ruleExecution?.numTriggeredActions.value ?? 0;
  });

  return objToReturn;
}

export function formatExecutionKPIResult(results: AggregateEventsBySavedObjectResult) {
  const { aggregations } = results;
  if (!aggregations || !aggregations.excludeExecuteStart) {
    return EMPTY_EXECUTION_KPI_RESULT;
  }
  const aggs = aggregations.excludeExecuteStart as ExcludeExecuteStartKpiAggResult;
  const buckets = aggs.executionUuid.buckets;
  return formatExecutionKPIAggBuckets(buckets);
}

export function formatExecutionLogResult(
  results: AggregateEventsBySavedObjectResult
): IExecutionLogResult {
  const { aggregations } = results;

  if (!aggregations || !aggregations.excludeExecuteStart) {
    return EMPTY_EXECUTION_LOG_RESULT;
  }

  const aggs = aggregations.excludeExecuteStart as ExcludeExecuteStartAggResult;

  const total = aggs.executionUuidCardinality.executionUuidCardinality.value;
  const buckets = aggs.executionUuid.buckets;

  return {
    total,
    data: buckets.map((bucket: IExecutionUuidAggBucket) => formatExecutionLogAggBucket(bucket)),
  };
}

export function getNumExecutions(dateStart: Date, dateEnd: Date, ruleSchedule: string) {
  const durationInMillis = dateEnd.getTime() - dateStart.getTime();
  const scheduleMillis = parseDuration(ruleSchedule);

  const numExecutions = Math.ceil(durationInMillis / scheduleMillis);

  return Math.min(numExecutions < 0 ? 0 : numExecutions, DEFAULT_MAX_BUCKETS_LIMIT);
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
