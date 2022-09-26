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
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
} from '../types';
import { createSearchAfterReturnType, mergeReturns } from '../utils';
import { getEventsByGroup } from './get_events_by_group';
import type { QueryRuleParams } from '../../schemas/rule_schemas';
import { sendAlertTelemetryEvents } from '../send_telemetry_events';
import type { ThrottleBuckets } from '../../rule_types/factories/utils/wrap_throttled_alerts';
import { wrapThrottledAlerts } from '../../rule_types/factories/utils/wrap_throttled_alerts';
import { ConfigType } from '../../../../config';

export interface ThrottleGroup {
  field: string;
  value: string | number;
}

export interface BucketHistory {
  keyValuePairs: ThrottleGroup[];
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
}): estypes.QueryDslQueryContainer => {
  return {
    bool: {
      must_not: buckets.map((bucket) => ({
        bool: {
          must: [
            ...bucket.keyValuePairs.map((kvp) => ({
              term: {
                [kvp.field]: kvp.value,
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
  };
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
  listClient,
  pageSize,
  ruleExecutionLogger,
  services,
  sortOrder,
  trackTotalHits,
  tuple,
  wrapHits,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  bucketHistory,
  aggregatableTimestampField,
  spaceId,
  mergeStrategy,
}: SearchAfterAndBulkCreateParams & {
  bucketHistory?: BucketHistory[];
  aggregatableTimestampField: string;
  spaceId: string;
  mergeStrategy: ConfigType['alertMergeStrategy'];
}): Promise<SearchAfterAndBulkCreateReturnType> => {
  return withSecuritySpan('groupAndBulkCreate', async () => {
    let toReturn = createSearchAfterReturnType();

    try {
      // TODO: Determine field(s) to group by
      // Current thoughts...
      // - analyze query for fields/wildcards
      // - get a random sample of docs... analyze fields in the docs
      // - use that to determine which fields to group by
      // - low cardinality and high cardinality are probably not interesting
      // maybe somewhere in the middle?
      // - also, should we sort first by severity?

      // TODO: remove this type assertion once threat_match grouping is implemented
      // Default to host.name for now
      const groupByFields = (completeRule.ruleParams as QueryRuleParams).alertGrouping?.groupBy ?? [
        'host.name',
      ];

      if (groupByFields.length === 0) {
        return createSearchAfterReturnType({
          success: false,
          errors: ['no groupBy fields found'],
        });
      }

      const rangeFilter = buildTimeRangeFilter({
        to: tuple.to.toISOString(),
        from: tuple.from.toISOString(),
        primaryTimestamp,
        secondaryTimestamp,
      });

      const filterWithTime: estypes.QueryDslQueryContainer[] = [filter, rangeFilter];

      if (bucketHistory != null) {
        filterWithTime.push(
          buildBucketHistoryFilter({
            buckets: bucketHistory,
            primaryTimestamp,
            secondaryTimestamp,
            from: tuple.from,
          })
        );
      }

      const baseQuery: estypes.SearchRequest = {
        allow_no_indices: true,
        index: inputIndexPattern,
        ignore_unavailable: true,
        track_total_hits: trackTotalHits,
        runtime_mappings: runtimeMappings,
        query: {
          bool: {
            filter: filterWithTime,
          },
        },
      };

      // Get aggregated results
      const eventsByGroupResponse = await getEventsByGroup({
        baseQuery,
        groupByFields,
        services,
        maxSignals: tuple.maxSignals,
        aggregatableTimestampField,
      });

      const eventsByGroupResponseWithAggs =
        eventsByGroupResponse as EventGroupingMultiBucketAggregationResult;
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
      //const wrappedDocs = wrapHits(enrichedEvents, buildReasonMessage);

      const {
        bulkCreateDuration: bulkDuration,
        createdItemsCount: createdCount,
        createdItems,
        success: bulkSuccess,
        errors: bulkErrors,
      } = await bulkCreate(wrappedAlerts);

      toReturn = mergeReturns([
        toReturn,
        createSearchAfterReturnType({
          success: bulkSuccess,
          createdSignalsCount: createdCount,
          createdSignals: createdItems,
          bulkCreateTimes: [bulkDuration],
          errors: bulkErrors,
        }),
      ]);

      ruleExecutionLogger.debug(`created ${createdCount} signals`);

      // TODO: telemetry?
      /* sendAlertTelemetryEvents(
          enrichedEvents,
          createdItems,
          eventsTelemetry,
          ruleExecutionLogger
        );*/
    } catch (exc: unknown) {
      return createSearchAfterReturnType({
        success: false,
        errors: [`${exc}`],
      });
    }

    return toReturn;
  });
};
