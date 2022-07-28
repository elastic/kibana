/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import { withSecuritySpan } from '../../../utils/with_security_span';
import { buildTimeRangeFilter } from './build_events_query';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
} from './types';
import { createSearchAfterReturnType } from './utils';

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
    const toReturn = createSearchAfterReturnType();

    const to = tuple.to.toISOString();
    const from = tuple.from.toISOString();

    const rangeFilter = buildTimeRangeFilter({
      to,
      from,
      primaryTimestamp,
      secondaryTimestamp,
    });

    const filterWithTime: estypes.QueryDslQueryContainer[] = [filter, rangeFilter];

    const baseQuery = {
      allow_no_indices: true,
      runtime_mappings: runtimeMappings,
      index: inputIndexPattern,
      ignore_unavailable: true,
      track_total_hits: trackTotalHits,
      body: {
        query: {
          bool: {
            filter: [...filterWithTime],
          },
        },
      },
    };

    const getCardinality = async (_baseQuery: estypes.SearchRequest) => {
      return services.scopedClusterClient.asCurrentUser.search({
        ..._baseQuery,
        size: 0,
        body: {
          ..._baseQuery.body,
          aggregations: {
            fieldCardinality: {
              cardinality: {
                // TODO: typing
                field: (completeRule.ruleParams as unknown as { groupBy: string[] }).groupBy[0],
              },
            },
          },
        },
      });
    };

    const getEventsByGroup = async (
      _baseQuery: estypes.SearchRequest,
      bucketSize: number,
      topHitsSize: number,
      sort: estypes.Sort
    ) => {
      return services.scopedClusterClient.asCurrentUser.search({
        ..._baseQuery,
        body: {
          ..._baseQuery.body,
          track_total_hits: true,
          aggs: {
            eventGroups: {
              terms: {
                // TODO: typing
                field: (completeRule.ruleParams as unknown as { groupBy: string[] }).groupBy[0],
                size: bucketSize,
              },
              aggs: {
                topHits: {
                  top_hits: {
                    sort: [],
                    size: topHitsSize,
                  },
                },
              },
            },
          },
        },
      });
    };

    // Get cardinality of "groupBy" field
    const cardinality = await getCardinality(baseQuery);
    // TODO: typing
    const cardinalityValue = cardinality.aggregations?.fieldCardinality?.value ?? 0;

    // Calculate top_hits size
    const topHitsSize = Math.max(tuple.maxSignals / cardinalityValue, 1);

    const sort: estypes.Sort = [];
    sort.push({
      [primaryTimestamp]: {
        order: sortOrder ?? 'asc',
        unmapped_type: 'date',
      },
    });
    if (secondaryTimestamp) {
      sort.push({
        [secondaryTimestamp]: {
          order: sortOrder ?? 'asc',
          unmapped_type: 'date',
        },
      });
    }

    const bucketSize = Math.min(cardinalityValue, 10000);

    // Get aggregated results
    const aggResults = await getEventsByGroup(baseQuery, bucketSize, topHitsSize, sort);

    const buckets = aggResults.aggregations?.eventGroups.buckets;
    const numBuckets = buckets.length;

    // Index
    const toIndex: Array<estypes.SearchHit<SignalSource>> = [];

    let i = 0;
    let j = 0;
    while (toIndex.length < Math.min(tuple.maxSignals, aggResults.hits.total?.value ?? 0)) {
      const hits = buckets[i].topHits.hits.hits;
      const event = hits[j];

      if (event != null) {
        toIndex.push(event);
      }

      i = (i + 1) % numBuckets;
      if (i === 0) {
        j += 1;
      }
    }

    // TODO: bulk create

    return toReturn;
  });
};
