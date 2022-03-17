/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { singleSearchAfter } from './single_search_after';
import { filterEventsAgainstList } from './filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import {
  createSearchAfterReturnType,
  createSearchResultReturnType,
  createSearchAfterReturnTypeFromResponse,
  getTotalHitsValue,
  mergeReturns,
  mergeSearchResults,
  getSafeSortIds,
} from './utils';
import { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from './types';
import { withSecuritySpan } from '../../../utils/with_security_span';

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  buildReasonMessage,
  buildRuleMessage,
  bulkCreate,
  completeRule,
  enrichment = identity,
  eventsTelemetry,
  exceptionsList,
  filter,
  inputIndexPattern,
  listClient,
  logger,
  pageSize,
  services,
  sortOrder,
  trackTotalHits,
  tuple,
  wrapHits,
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  return withSecuritySpan('searchAfterAndBulkCreate', async () => {
    const ruleParams = completeRule.ruleParams;
    let toReturn = createSearchAfterReturnType();

    // sortId tells us where to start our next consecutive search_after query
    let sortIds: estypes.SortResults | undefined;
    let hasSortId = true; // default to true so we execute the search on initial run

    // signalsCreatedCount keeps track of how many signals we have created,
    // to ensure we don't exceed maxSignals
    let signalsCreatedCount = 0;

    if (tuple == null || tuple.to == null || tuple.from == null) {
      logger.error(buildRuleMessage(`[-] malformed date tuple`));
      return createSearchAfterReturnType({
        success: false,
        errors: ['malformed date tuple'],
      });
    }
    signalsCreatedCount = 0;
    while (signalsCreatedCount < tuple.maxSignals) {
      try {
        let mergedSearchResults = createSearchResultReturnType();
        logger.debug(buildRuleMessage(`sortIds: ${sortIds}`));

        if (hasSortId) {
          const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
            buildRuleMessage,
            searchAfterSortIds: sortIds,
            index: inputIndexPattern,
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            logger,
            // @ts-expect-error please, declare a type explicitly instead of unknown
            filter,
            pageSize: Math.ceil(Math.min(tuple.maxSignals, pageSize)),
            timestampOverride: ruleParams.timestampOverride,
            trackTotalHits,
            sortOrder,
          });
          mergedSearchResults = mergeSearchResults([mergedSearchResults, searchResult]);
          toReturn = mergeReturns([
            toReturn,
            createSearchAfterReturnTypeFromResponse({
              searchResult: mergedSearchResults,
              timestampOverride: ruleParams.timestampOverride,
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
        logger.debug(buildRuleMessage(`totalHits: ${totalHits}`));
        logger.debug(
          buildRuleMessage(`searchResult.hit.hits.length: ${mergedSearchResults.hits.hits.length}`)
        );

        if (totalHits === 0 || mergedSearchResults.hits.hits.length === 0) {
          logger.debug(
            buildRuleMessage(
              `${
                totalHits === 0 ? 'totalHits' : 'searchResult.hits.hits.length'
              } was 0, exiting early`
            )
          );
          break;
        }

        // filter out the search results that match with the values found in the list.
        // the resulting set are signals to be indexed, given they are not duplicates
        // of signals already present in the signals index.
        const filteredEvents = await filterEventsAgainstList({
          listClient,
          exceptionsList,
          logger,
          eventSearchResult: mergedSearchResults,
          buildRuleMessage,
        });

        // only bulk create if there are filteredEvents leftover
        // if there isn't anything after going through the value list filter
        // skip the call to bulk create and proceed to the next search_after,
        // if there is a sort id to continue the search_after with.
        if (filteredEvents.hits.hits.length !== 0) {
          // make sure we are not going to create more signals than maxSignals allows
          if (signalsCreatedCount + filteredEvents.hits.hits.length > tuple.maxSignals) {
            filteredEvents.hits.hits = filteredEvents.hits.hits.slice(
              0,
              tuple.maxSignals - signalsCreatedCount
            );
          }
          const enrichedEvents = await enrichment(filteredEvents);
          const wrappedDocs = wrapHits(enrichedEvents.hits.hits, buildReasonMessage);

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
              bulkCreateTimes: bulkDuration ? [bulkDuration] : undefined,
              errors: bulkErrors,
            }),
          ]);
          signalsCreatedCount += createdCount;
          logger.debug(buildRuleMessage(`created ${createdCount} signals`));
          logger.debug(buildRuleMessage(`signalsCreatedCount: ${signalsCreatedCount}`));
          logger.debug(
            buildRuleMessage(`enrichedEvents.hits.hits: ${enrichedEvents.hits.hits.length}`)
          );

          sendAlertTelemetryEvents(
            logger,
            eventsTelemetry,
            enrichedEvents,
            createdItems,
            buildRuleMessage
          );
        }

        if (!hasSortId) {
          logger.debug(buildRuleMessage('ran out of sort ids to sort on'));
          break;
        }
      } catch (exc: unknown) {
        logger.error(buildRuleMessage(`[-] search_after_bulk_create threw an error ${exc}`));
        return mergeReturns([
          toReturn,
          createSearchAfterReturnType({
            success: false,
            errors: [`${exc}`],
          }),
        ]);
      }
    }
    logger.debug(buildRuleMessage(`[+] completed bulk index of ${toReturn.createdSignalsCount}`));
    return toReturn;
  });
};
