/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { singleSearchAfter } from './single_search_after';
import { filterEventsAgainstList } from './large_list_filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import {
  createSearchAfterReturnType,
  createSearchResultReturnType,
  createSearchAfterReturnTypeFromResponse,
  getTotalHitsValue,
  mergeReturns,
  mergeSearchResults,
  getSafeSortIds,
  addToSearchAfterReturn,
  getMaxSignalsWarning,
} from './utils';
import type { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from '../types';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { createEnrichEventsFunction } from './enrichments';

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  buildReasonMessage,
  bulkCreate,
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
  additionalFilters,
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  return withSecuritySpan('searchAfterAndBulkCreate', async () => {
    let toReturn = createSearchAfterReturnType();

    // sortId tells us where to start our next consecutive search_after query
    let sortIds: estypes.SortResults | undefined;
    let hasSortId = true; // default to true so we execute the search on initial run

    if (tuple == null || tuple.to == null || tuple.from == null) {
      ruleExecutionLogger.error(`[-] malformed date tuple`);
      return createSearchAfterReturnType({
        success: false,
        errors: ['malformed date tuple'],
      });
    }

    while (toReturn.createdSignalsCount <= tuple.maxSignals) {
      try {
        let mergedSearchResults = createSearchResultReturnType();
        ruleExecutionLogger.debug(`sortIds: ${sortIds}`);

        if (hasSortId) {
          const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
            searchAfterSortIds: sortIds,
            index: inputIndexPattern,
            runtimeMappings,
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            ruleExecutionLogger,
            filter,
            pageSize: Math.ceil(Math.min(tuple.maxSignals, pageSize)),
            primaryTimestamp,
            secondaryTimestamp,
            trackTotalHits,
            sortOrder,
            additionalFilters,
          });
          mergedSearchResults = mergeSearchResults([mergedSearchResults, searchResult]);
          toReturn = mergeReturns([
            toReturn,
            createSearchAfterReturnTypeFromResponse({
              searchResult: mergedSearchResults,
              primaryTimestamp,
            }),
            createSearchAfterReturnType({
              searchAfterTimes: [searchDuration],
              errors: searchErrors,
            }),
          ]);

          const lastSortIds = getSafeSortIds(
            searchResult.hits.hits[searchResult.hits.hits.length - 1]?.sort
          );
          if (lastSortIds != null && lastSortIds.length !== 0) {
            sortIds = lastSortIds;
            hasSortId = true;
          } else {
            hasSortId = false;
          }
        }

        // determine if there are any candidate signals to be processed
        const totalHits = getTotalHitsValue(mergedSearchResults.hits.total);
        ruleExecutionLogger.debug(`totalHits: ${totalHits}`);
        ruleExecutionLogger.debug(
          `searchResult.hit.hits.length: ${mergedSearchResults.hits.hits.length}`
        );

        if (totalHits === 0 || mergedSearchResults.hits.hits.length === 0) {
          ruleExecutionLogger.debug(
            `${
              totalHits === 0 ? 'totalHits' : 'searchResult.hits.hits.length'
            } was 0, exiting early`
          );
          break;
        }

        // filter out the search results that match with the values found in the list.
        // the resulting set are signals to be indexed, given they are not duplicates
        // of signals already present in the signals index.
        const [includedEvents, _] = await filterEventsAgainstList({
          listClient,
          exceptionsList,
          ruleExecutionLogger,
          events: mergedSearchResults.hits.hits,
        });

        // only bulk create if there are filteredEvents leftover
        // if there isn't anything after going through the value list filter
        // skip the call to bulk create and proceed to the next search_after,
        // if there is a sort id to continue the search_after with.
        if (includedEvents.length !== 0) {
          const enrichedEvents = await enrichment(includedEvents);
          const wrappedDocs = wrapHits(enrichedEvents, buildReasonMessage);

          const bulkCreateResult = await bulkCreate(
            wrappedDocs,
            tuple.maxSignals - toReturn.createdSignalsCount,
            createEnrichEventsFunction({
              services,
              logger: ruleExecutionLogger,
            })
          );

          if (bulkCreateResult.alertsWereTruncated) {
            toReturn.warningMessages.push(getMaxSignalsWarning());
            break;
          }

          addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

          ruleExecutionLogger.debug(`created ${bulkCreateResult.createdItemsCount} signals`);
          ruleExecutionLogger.debug(`signalsCreatedCount: ${toReturn.createdSignalsCount}`);
          ruleExecutionLogger.debug(`enrichedEvents.hits.hits: ${enrichedEvents.length}`);

          sendAlertTelemetryEvents(
            enrichedEvents,
            bulkCreateResult.createdItems,
            eventsTelemetry,
            ruleExecutionLogger
          );
        }

        if (!hasSortId) {
          ruleExecutionLogger.debug('ran out of sort ids to sort on');
          break;
        }
      } catch (exc: unknown) {
        ruleExecutionLogger.error(`[-] search_after_bulk_create threw an error ${exc}`);
        return mergeReturns([
          toReturn,
          createSearchAfterReturnType({
            success: false,
            errors: [`${exc}`],
          }),
        ]);
      }
    }
    ruleExecutionLogger.debug(`[+] completed bulk index of ${toReturn.createdSignalsCount}`);
    return toReturn;
  });
};
