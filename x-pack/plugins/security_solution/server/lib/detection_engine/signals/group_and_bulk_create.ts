/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createSearchAfterReturnType } from './utils';
import type { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from './types';
import { withSecuritySpan } from '../../../utils/with_security_span';
import { buildTimeRangeFilter } from './build_events_query';

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

    const getEventsByGroup = async (_baseQuery: estypes.SearchRequest, bucketSize: number) => {
      // TODO
    };

    // Get cardinality of "groupBy" field
    const cardinality = await getCardinality(baseQuery);
    // TODO: typing
    const cardinalityValue = cardinality.aggregations?.fieldCardinality?.value ?? 0;

    // Calculate top_hits size
    const topHitsSize = Math.max(tuple.maxSignals / cardinalityValue, 1);

    // Get aggregated results
    const aggResult = await getEventsByGroup(baseQuery, Math.min(cardinalityValue, 10000));

    // TODO
    // Intialize bucketsToIndex = {}
    // If value list exceptions:
    //   For each exception list entry
    //      For each bucket
    //         Filter against list
    //         If docs left over, add to bucketsToIndex
    // For each bucket (mod cardinalityValue)
    //    Add to index list
    // Bulk create from index list

    return toReturn;
  });
};
