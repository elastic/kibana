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
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
} from './types';
import { createSearchAfterReturnType } from './utils';
import type {
  CompleteRule,
  QueryRuleParams,
  SavedQueryRuleParams,
  ThreatRuleParams,
} from '../schemas/rule_schemas';

interface BaseArgs {
  baseQuery: estypes.SearchRequest;
  completeRule:
    | CompleteRule<QueryRuleParams>
    | CompleteRule<SavedQueryRuleParams>
    | CompleteRule<ThreatRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
}
type GetCardinalityArgs = BaseArgs;

interface GetEventsByGroupArgs extends BaseArgs {
  topHitsSize: number;
  sort: estypes.Sort;
}

const getCardinality = async ({ baseQuery, completeRule, services }: GetCardinalityArgs) => {
  return services.scopedClusterClient.asCurrentUser.search({
    ...baseQuery,
    size: 0,
    body: {
      ...baseQuery.body,
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

const getEventsByGroup = async ({
  baseQuery,
  completeRule,
  services,
  topHitsSize,
  sort,
}: GetEventsByGroupArgs) => {
  return services.scopedClusterClient.asCurrentUser.search({
    ...baseQuery,
    body: {
      ...baseQuery.body,
      track_total_hits: true,
      aggs: {
        eventGroups: {
          terms: {
            // TODO: typing
            field: (completeRule.ruleParams as unknown as { groupBy: string[] }).groupBy[0],
            size: 10000,
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
            filter: [...filterWithTime],
          },
        },
      },
    };

    // Get cardinality of "groupBy" field
    const cardinality = await getCardinality({
      baseQuery,
      completeRule,
      services,
    });
    // TODO: typing
    const cardinalityValue = cardinality.aggregations?.fieldCardinality?.value ?? 0;

    // Calculate top_hits size
    // e.g. when maxSignals is 100 and the field has cardinality 5, we
    // have 5 buckets. Thus we need at least 100 / 5 = 20 hits per bucket.
    // TODO: We may need to go back and get more if not evenly distributed.
    const topHitsSize = Math.max(tuple.maxSignals / cardinalityValue, 1);

    // reverse the sort order so we can pop() instead of shift() (more efficient)
    const reverseSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';

    const sort: estypes.Sort = [];
    sort.push({
      [primaryTimestamp]: {
        order: reverseSortOrder,
        unmapped_type: 'date',
      },
    });
    if (secondaryTimestamp) {
      sort.push({
        [secondaryTimestamp]: {
          order: reverseSortOrder,
          unmapped_type: 'date',
        },
      });
    }

    // Get aggregated results
    const eventsByGroupResponse = await getEventsByGroup({
      baseQuery,
      completeRule,
      services,
      topHitsSize,
      sort,
    });

    const buckets = eventsByGroupResponse.aggregations?.eventGroups.buckets;
    const numBuckets = buckets.length;

    // Index
    const numToIndex = Math.min(tuple.maxSignals, eventsByGroupResponse.hits.total?.value);
    const toIndex: Array<estypes.SearchHit<SignalSource>> = [];

    let indexedThisPass = [];
    let indexedLastPass = [];
    for (let i = 0; ; i = (i + 1) % numBuckets) {
      if (i === 0) {
        if (indexedThisPass.length) {
          indexedLastPass = [...indexedThisPass];
          indexedThisPass = [];
        } else if (indexedLastPass.length) {
          // we didn't find anything on this pass through, so we're done
          break;
        }
      }

      const event = buckets[i].topHits.hits.hits.pop();
      if (event != null) {
        toIndex.push(event);
        indexedThisPass.push(bucket[i].key);
      }
    }

    if (toIndex.length < numToIndex) {
      // TODO: we need to go back and get more results
      // Query for terms using search_after (we need to get the sort keys above)
    }

    // TODO: bulk create

    return toReturn;
  });
};
