/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identity } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import { singleSearchAfter } from './single_search_after';
import { filterEventsAgainstList } from './filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import {
  createSearchAfterReturnType,
  createSearchResultReturnType,
  createSearchAfterReturnTypeFromResponse,
  createTotalHitsFromSearchResult,
  mergeReturns,
  mergeSearchResults,
  getSafeSortIds,
  getLock,
  releaseLock,
} from './utils';
import { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from './types';

// search_after through documents and re-index using bulk endpoint.
// eslint-disable-next-line complexity
export const searchAfterAndBulkCreate = async ({
  tuple,
  ruleSO,
  exceptionsList,
  services,
  listClient,
  logger,
  eventsTelemetry,
  inputIndexPattern,
  filter,
  pageSize,
  buildRuleMessage,
  enrichment = identity,
  bulkCreate,
  wrapHits,
  state,
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  const ruleParams = ruleSO.attributes.params;
  let toReturn = createSearchAfterReturnType();

  // sortId tells us where to start our next consecutive search_after query
  let sortIds: estypes.SearchSortResults | undefined;
  let hasSortId = true; // default to true so we execute the search on initial run

  // signalsCreatedCount keeps track of how many signals we have created,
  // to ensure we don't exceed maxSignals
  let signalsCreatedCount = 0;
  const signalsAlreadyCreated = () => state?.signalsCreated || 0;
  const totalSignalsCreated = (_signalsCreatedCount: number): number => {
    return _signalsCreatedCount + signalsAlreadyCreated();
  };

  if (tuple == null || tuple.to == null || tuple.from == null) {
    logger.error(buildRuleMessage(`[-] malformed date tuple`));
    if (state != null) {
      releaseLock(state);
    }
    return createSearchAfterReturnType({
      success: false,
      errors: ['malformed date tuple'],
    });
  }
  while (totalSignalsCreated(signalsCreatedCount) < tuple.maxSignals) {
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
      const totalHits = createTotalHitsFromSearchResult({ searchResult: mergedSearchResults });
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
        if (state != null) {
          const error = await getLock(state);
          if (error != null) {
            logger.error(buildRuleMessage(error));
            return createSearchAfterReturnType({
              success: false,
              errors: [error],
            });
          }
        }

        // make sure we are not going to create more signals than maxSignals allows
        if (
          totalSignalsCreated(signalsCreatedCount) + filteredEvents.hits.hits.length >
          tuple.maxSignals
        ) {
          filteredEvents.hits.hits = filteredEvents.hits.hits.slice(
            0,
            tuple.maxSignals - totalSignalsCreated(signalsCreatedCount)
          );
        }
        const enrichedEvents = await enrichment(filteredEvents);
        const wrappedDocs = wrapHits(enrichedEvents.hits.hits);

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
        if (state != null) {
          // Protected by lock
          // eslint-disable-next-line require-atomic-updates
          state.signalsCreated += createdCount;
          releaseLock(state);
        }
        logger.debug(buildRuleMessage(`created ${createdCount} signals`));
        logger.debug(buildRuleMessage(`signalsCreatedCount: ${signalsCreatedCount}`));
        logger.debug(
          buildRuleMessage(`enrichedEvents.hits.hits: ${enrichedEvents.hits.hits.length}`)
        );

        sendAlertTelemetryEvents(logger, eventsTelemetry, enrichedEvents, buildRuleMessage);
      }

      if (!hasSortId) {
        logger.debug(buildRuleMessage('ran out of sort ids to sort on'));
        break;
      }
    } catch (exc: unknown) {
      logger.error(buildRuleMessage(`[-] search_after and bulk threw an error ${exc}`));
      if (state != null) {
        releaseLock(state);
      }
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
};
