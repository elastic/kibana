/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { identity } from 'lodash';
import moment from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildTimeRangeFilter } from '../build_events_query';
import type {
  EventGroupingMultiBucketAggregationResult,
  GroupAndBulkCreateReturnType,
  SearchAfterAndBulkCreateParams,
} from '../types';
import { addToSearchAfterReturn, getUnprocessedExceptionsWarnings } from '../utils';
import type { CompleteRule, UnifiedQueryRuleParams } from '../../schemas/rule_schemas';
import type { ThrottleBuckets } from '../../rule_types/factories/utils/wrap_throttled_alerts';
import { wrapThrottledAlerts } from '../../rule_types/factories/utils/wrap_throttled_alerts';
import { ConfigType } from '../../../../config';
import { buildGroupByFieldAggregation } from './build_group_by_field_aggregation';
import { singleSearchAfter } from '../single_search_after';

export interface BucketHistory {
  key: Record<string, string | number>;
  endDate: Date;
}

export const buildBucketHistoryFilter = ({
  buckets,
  primaryTimestamp,
  secondaryTimestamp,
  from,
}: {
  buckets: BucketHistory[];
  primaryTimestamp: string;
  secondaryTimestamp: string | undefined;
  from: moment.Moment;
}): estypes.QueryDslQueryContainer[] | undefined => {
  if (buckets.length === 0) {
    return undefined;
  }
  return [
    {
      bool: {
        must_not: buckets.map((bucket) => ({
          bool: {
            must: [
              ...Object.entries(bucket.key).map(([field, value]) => ({
                term: {
                  [field]: value,
                },
              })),
              buildTimeRangeFilter({
                to: bucket.endDate.toISOString(),
                from: from.toISOString(),
                primaryTimestamp,
                secondaryTimestamp,
              }),
            ],
          },
        })),
      },
    },
  ];
};

// search_after through grouped documents and re-index using bulk endpoint.
export const groupAndBulkCreate = async ({
  buildReasonMessage,
  bulkCreate,
  completeRule,
  enrichment = identity,
  eventsTelemetry,
  exceptionsList,
  filter,
  inputIndexPattern,
  ruleExecutionLogger,
  services,
  tuple,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  bucketHistory,
  aggregatableTimestampField,
  spaceId,
  mergeStrategy,
  groupByFields,
}: SearchAfterAndBulkCreateParams & {
  bucketHistory?: BucketHistory[];
  aggregatableTimestampField: string;
  spaceId: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  completeRule: CompleteRule<UnifiedQueryRuleParams>;
  groupByFields: string[];
}): Promise<GroupAndBulkCreateReturnType> => {
  return withSecuritySpan('groupAndBulkCreate', async () => {
    const filteredBucketHistory =
      bucketHistory?.filter((bucket) => {
        bucket.endDate > tuple.from.toDate();
      }) ?? [];

    let toReturn: GroupAndBulkCreateReturnType = {
      success: true,
      warning: false,
      searchAfterTimes: [],
      bulkCreateTimes: [],
      lastLookBackDate: null,
      createdSignalsCount: 0,
      createdSignals: [],
      errors: [],
      warningMessages: [],
      state: {
        throttleGroupHistory: filteredBucketHistory,
      },
    };

    const exceptionsWarning = getUnprocessedExceptionsWarnings(exceptionsList);
    if (exceptionsWarning) {
      toReturn.warningMessages.push(exceptionsWarning);
    }

    try {
      if (groupByFields.length === 0) {
        throw new Error('groupByFields length must be greater than 0');
      }

      const bucketHistoryFilter = buildBucketHistoryFilter({
        buckets: filteredBucketHistory,
        primaryTimestamp,
        secondaryTimestamp,
        from: tuple.from,
      });

      const groupingAggregation = buildGroupByFieldAggregation({
        groupByFields,
        maxSignals: tuple.maxSignals,
        aggregatableTimestampField,
      });

      const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
        aggregations: groupingAggregation,
        searchAfterSortIds: undefined,
        index: inputIndexPattern,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        services,
        ruleExecutionLogger,
        filter,
        pageSize: 0,
        primaryTimestamp,
        secondaryTimestamp,
        runtimeMappings,
        additionalFilters: bucketHistoryFilter,
      });
      toReturn.searchAfterTimes.push(searchDuration);
      toReturn.errors.push(...searchErrors);

      const eventsByGroupResponseWithAggs =
        searchResult as EventGroupingMultiBucketAggregationResult;
      if (!eventsByGroupResponseWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      const buckets = eventsByGroupResponseWithAggs.aggregations.eventGroups.buckets;

      if (buckets.length === 0) {
        return toReturn;
      }

      const throttleBuckets: ThrottleBuckets[] = buckets.map((bucket) => ({
        event: bucket.topHits.hits.hits[0],
        count: bucket.doc_count,
        start: bucket.min_timestamp.value_as_string
          ? new Date(bucket.min_timestamp.value_as_string)
          : tuple.from.toDate(),
        end: bucket.max_timestamp.value_as_string
          ? new Date(bucket.max_timestamp.value_as_string)
          : tuple.to.toDate(),
        values: Object.values(bucket.key),
      }));

      const wrappedAlerts = wrapThrottledAlerts({
        throttleBuckets,
        spaceId,
        completeRule,
        mergeStrategy,
        indicesToQuery: inputIndexPattern,
        buildReasonMessage,
      });

      // const enrichedEvents = await enrichment(wrappedAlerts);

      const bulkCreateResult = await bulkCreate(wrappedAlerts);

      addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

      ruleExecutionLogger.debug(`created ${bulkCreateResult.createdItemsCount} signals`);

      const newBucketHistory: BucketHistory[] = buckets
        .filter((bucket) => {
          return !Object.values(bucket.key).includes(null);
        })
        .map((bucket) => {
          return {
            // This cast should be safe as we just filtered out buckets where any key has a null value.
            key: bucket.key as Record<string, string | number>,
            endDate: bucket.max_timestamp.value_as_string
              ? new Date(bucket.max_timestamp.value_as_string)
              : tuple.to.toDate(),
          };
        });

      toReturn.state.throttleGroupHistory.push(...newBucketHistory);
      // TODO: telemetry?`
      /* sendAlertTelemetryEvents(
        enrichedEvents,
        createdItems,
        eventsTelemetry,
        ruleExecutionLogger
      );*/
    } catch (exc) {
      toReturn.success = false;
      toReturn.errors.push(exc.message);
    }

    return toReturn;
  });
};
