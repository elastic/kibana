/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AlertInstanceState, AlertInstanceContext } from '@kbn/alerting-plugin/common';
import type { RuleExecutorServices } from '@kbn/alerting-plugin/server';

import { withSecuritySpan } from '../../../utils/with_security_span';
import { buildTimeRangeFilter } from './build_events_query';
import type {
  EventGroupingMultiBucketAggregationResult,
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
} from './types';
import { createSearchAfterReturnType } from './utils';

interface BaseArgs {
  baseQuery: estypes.SearchRequest;
  groupByFields: string[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
}

interface GetEventsByGroupArgs extends BaseArgs {
  maxSignals: number;
  sort: estypes.Sort;
}

interface GetGroupByFieldAggregationArgs {
  groupByFields: string[];
  maxSignals: number;
  sort: estypes.Sort;
}

export const buildGroupByFieldAggregation = ({
  groupByFields,
  maxSignals,
  sort,
}: GetGroupByFieldAggregationArgs) => ({
  eventGroups: {
    terms: {
      field: groupByFields[0],
      size: maxSignals,
      min_doc_count: 1,
    },
    aggs: {
      topHits: {
        top_hits: {
          sort,
          size: maxSignals,
        },
      },
    },
  },
});

const getEventsByGroup = async ({
  baseQuery,
  groupByFields,
  services,
  maxSignals,
  sort,
}: GetEventsByGroupArgs) => {
  return services.scopedClusterClient.asCurrentUser.search({
    ...baseQuery,
    body: {
      ...baseQuery.body,
      track_total_hits: true,
      aggs: buildGroupByFieldAggregation({ groupByFields, maxSignals, sort }),
    },
  });
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
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  return withSecuritySpan('groupAndBulkCreate', async () => {
    if (tuple == null || tuple.to == null || tuple.from == null) {
      ruleExecutionLogger.error(`[-] malformed date tuple`);
      return createSearchAfterReturnType({
        success: false,
        errors: ['malformed date tuple'],
      });
    }

    const to = tuple.to.toISOString();
    const from = tuple.from.toISOString();

    try {
      const rangeFilter = buildTimeRangeFilter({
        to,
        from,
        primaryTimestamp,
        secondaryTimestamp,
      });

      const filterWithTime: estypes.QueryDslQueryContainer[] = [filter, rangeFilter];

      const baseQuery: estypes.SearchRequest & {
        runtime_mappings: estypes.MappingRuntimeFields | undefined;
      } = {
        allow_no_indices: true,
        runtime_mappings: runtimeMappings,
        index: inputIndexPattern,
        ignore_unavailable: true,
        track_total_hits: trackTotalHits,
        body: {
          query: {
            bool: {
              filter: filterWithTime,
            },
          },
        },
      };

      const sort: estypes.Sort = [];
      sort.push({
        [primaryTimestamp]: {
          order: sortOrder,
          unmapped_type: 'date',
        },
      });
      if (secondaryTimestamp) {
        sort.push({
          [secondaryTimestamp]: {
            order: sortOrder,
            unmapped_type: 'date',
          },
        });
      }

      // TODO: Determine field(s) to group by
      // Current thoughts...
      // - analyze query for fields/wildcards
      // - get a random sample of docs... analyze fields in the docs
      // - use that to determine which fields to group by
      // - low cardinality means we may want to group by that field?
      // - also, should we sort first by severity?

      // For now, group by host name
      const groupByFields: string[] = ['host.name'];

      // Get aggregated results
      const eventsByGroupResponse = await getEventsByGroup({
        baseQuery,
        groupByFields,
        services,
        maxSignals: tuple.maxSignals,
        sort,
      });

      const eventsByGroupResponseWithAggs =
        eventsByGroupResponse as EventGroupingMultiBucketAggregationResult;
      if (!eventsByGroupResponseWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      const buckets = eventsByGroupResponseWithAggs.aggregations.eventGroups.buckets;

      // Reverse so we can pop() instead of shift() for efficiency
      for (const bucket of buckets) {
        bucket.topHits.hits.hits.reverse();
      }

      // Index
      const toIndex: Array<estypes.SearchHit<SignalSource>> = [];

      let indexedThisPass = [];
      let indexedLastPass = [];
      for (let i = 0; ; i = (i + 1) % buckets.length) {
        if (i === 0) {
          if (!indexedThisPass.length && indexedLastPass.length) {
            break;
          }
          // spread to copy the array
          indexedLastPass = [...indexedThisPass];
          indexedThisPass = [];
        }

        const event = buckets[i].topHits.hits.hits.pop();
        if (event != null) {
          toIndex.push(event);
          indexedThisPass.push(buckets[i].key);
        }

        if (toIndex.length >= tuple.maxSignals) {
          break;
        }
      }

      const enrichedEvents = await enrichment(toIndex);
      const wrappedDocs = wrapHits(enrichedEvents, buildReasonMessage);

      const {
        bulkCreateDuration: bulkDuration,
        createdItemsCount: createdCount,
        createdItems,
        success: bulkSuccess,
        errors: bulkErrors,
      } = await bulkCreate(wrappedDocs);

      return createSearchAfterReturnType({
        success: bulkSuccess,
        createdSignalsCount: createdCount,
        createdSignals: createdItems,
        bulkCreateTimes: [bulkDuration],
        errors: bulkErrors,
      });
    } catch (exc: unknown) {
      return createSearchAfterReturnType({
        success: false,
        errors: [`${exc}`],
      });
    }
  });
};
