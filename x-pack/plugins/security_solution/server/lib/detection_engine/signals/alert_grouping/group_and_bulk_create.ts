/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { identity } from 'lodash';
import moment from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildTimeRangeFilter } from '../build_events_query';
import type {
  EventGroupingMultiBucketAggregationResult,
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  SignalSource,
} from '../types';
import { createSearchAfterReturnType, mergeReturns } from '../utils';
import { getEventsByGroup } from './get_events_by_group';
import type { QueryRuleParams } from '../../schemas/rule_schemas';
import { sendAlertTelemetryEvents } from '../send_telemetry_events';

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
    let toReturn = createSearchAfterReturnType();

    if (tuple == null || tuple.to == null || tuple.from == null) {
      ruleExecutionLogger.error(`[-] malformed date tuple`);
      return createSearchAfterReturnType({
        success: false,
        errors: ['malformed date tuple'],
      });
    }

    const _sortOrder = sortOrder ?? 'asc';

    try {
      const sort: estypes.Sort = [];
      sort.push({
        [primaryTimestamp]: {
          order: _sortOrder,
          unmapped_type: 'date',
        },
      });
      if (secondaryTimestamp) {
        sort.push({
          [secondaryTimestamp]: {
            order: _sortOrder,
            unmapped_type: 'date',
          },
        });
      }

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

      // alertsCreatedCount keeps track of how many signals we have created,
      // to ensure we don't exceed maxSignals
      let alertsCreatedCount = 0;

      const bucketHistory: Record<string, moment.Moment> = {};

      do {
        const rangeFilter = buildTimeRangeFilter({
          to: tuple.to.toISOString(),
          from: tuple.from.toISOString(),
          primaryTimestamp,
          secondaryTimestamp,
        });

        const bucketTimeFilters = {
          bool: {
            should: [
              ...Object.keys(bucketHistory).map((key) => ({
                bool: {
                  must: [
                    {
                      term: {
                        [groupByFields[0]]: key,
                      },
                    },
                    {
                      // TODO: secondaryTimestamp?
                      range: {
                        [primaryTimestamp]: {
                          ...(_sortOrder === 'asc'
                            ? { gt: bucketHistory[key].toISOString() }
                            : { lt: bucketHistory[key].toISOString() }),
                        },
                      },
                    },
                  ],
                },
              })),
            ],
          },
        };

        const filterWithTime: estypes.QueryDslQueryContainer[] = [
          filter,
          rangeFilter,
          bucketTimeFilters,
        ];

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
          const key = buckets[i].key;

          if (event != null) {
            toIndex.push(event);
            indexedThisPass.push(key);

            // TODO: secondaryTimestamp?
            const currentTimestamp =
              bucketHistory[key] ?? _sortOrder === 'asc' ? tuple.from : tuple.to;
            const eventTimestamp = moment(event._source[primaryTimestamp] as string);

            if (_sortOrder === 'asc') {
              if (eventTimestamp > currentTimestamp) {
                bucketHistory[key] = eventTimestamp;
              }
            } else if (_sortOrder === 'desc') {
              if (eventTimestamp < currentTimestamp) {
                bucketHistory[key] = eventTimestamp;
              }
            }
          }

          if (toIndex.length >= tuple.maxSignals) {
            break;
          }
        }

        const enrichedEvents = await enrichment(toIndex);
        const wrappedDocs = wrapHits(enrichedEvents, buildReasonMessage);

        if (wrappedDocs.length === 0) {
          break;
        }

        const {
          bulkCreateDuration: bulkDuration,
          createdItemsCount: createdCount,
          createdItems,
          success: bulkSuccess,
          errors: bulkErrors,
        } = await bulkCreate(wrappedDocs);

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

        alertsCreatedCount += createdCount;

        ruleExecutionLogger.debug(`created ${createdCount} signals`);
        ruleExecutionLogger.debug(`alertsCreatedCount: ${alertsCreatedCount}`);
        ruleExecutionLogger.debug(`enrichedEvents.hits.hits: ${enrichedEvents.length}`);

        sendAlertTelemetryEvents(
          enrichedEvents,
          createdItems,
          eventsTelemetry,
          ruleExecutionLogger
        );
      } while (alertsCreatedCount < tuple.maxSignals);
    } catch (exc: unknown) {
      return createSearchAfterReturnType({
        success: false,
        errors: [`${exc}`],
      });
    }

    return toReturn;
  });
};
