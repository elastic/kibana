/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { identity } from 'lodash';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { filterEventsAgainstList } from './filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import {
  createSearchAfterReturnType,
  createSearchResultReturnType,
  createSearchAfterReturnTypeFromResponse,
  createTotalHitsFromSearchResult,
  getSignalTimeTuples,
  mergeReturns,
  mergeSearchResults,
} from './utils';
import { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from './types';

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  gap,
  previousStartedAt,
  ruleParams,
  exceptionsList,
  services,
  listClient,
  logger,
  eventsTelemetry,
  id,
  inputIndexPattern,
  signalsIndex,
  filter,
  actions,
  name,
  createdAt,
  createdBy,
  updatedBy,
  updatedAt,
  interval,
  enabled,
  pageSize,
  refresh,
  tags,
  throttle,
  buildRuleMessage,
  enrichment = identity,
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  let toReturn = createSearchAfterReturnType();

  // sortId tells us where to start our next consecutive search_after query
  let sortId: string | undefined;
  let hasSortId = true; // default to true so we execute the search on initial run
  let backupSortId: string | undefined;
  let hasBackupSortId = ruleParams.timestampOverride ? true : false;

  // signalsCreatedCount keeps track of how many signals we have created,
  // to ensure we don't exceed maxSignals
  let signalsCreatedCount = 0;

  const totalToFromTuples = getSignalTimeTuples({
    logger,
    ruleParamsFrom: ruleParams.from,
    ruleParamsTo: ruleParams.to,
    ruleParamsMaxSignals: ruleParams.maxSignals,
    gap,
    previousStartedAt,
    interval,
    buildRuleMessage,
  });
  const tuplesToBeLogged = [...totalToFromTuples];
  logger.debug(buildRuleMessage(`totalToFromTuples: ${totalToFromTuples.length}`));

  while (totalToFromTuples.length > 0) {
    const tuple = totalToFromTuples.pop();
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
        logger.debug(buildRuleMessage(`sortIds: ${sortId}`));

        // if there is a timestampOverride param we always want to do a secondary search against @timestamp
        if (ruleParams.timestampOverride != null && hasBackupSortId) {
          // only execute search if we have something to sort on or if it is the first search
          const {
            searchResult: searchResultB,
            searchDuration: searchDurationB,
            searchErrors: searchErrorsB,
          } = await singleSearchAfter({
            buildRuleMessage,
            searchAfterSortId: backupSortId,
            index: inputIndexPattern,
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            logger,
            filter,
            pageSize: Math.ceil(Math.min(tuple.maxSignals, pageSize)),
            timestampOverride: ruleParams.timestampOverride,
            excludeDocsWithTimestampOverride: true,
          });

          // call this function setSortIdOrExit()
          const lastSortId = searchResultB?.hits?.hits[searchResultB.hits.hits.length - 1]?.sort;
          if (lastSortId != null && lastSortId.length !== 0) {
            backupSortId = lastSortId[0];
            hasBackupSortId = true;
          } else {
            logger.debug(buildRuleMessage('backupSortIds was empty on searchResultB'));
            hasBackupSortId = false;
          }

          mergedSearchResults = mergeSearchResults([mergedSearchResults, searchResultB]);

          toReturn = mergeReturns([
            toReturn,
            createSearchAfterReturnTypeFromResponse({
              searchResult: mergedSearchResults,
              timestampOverride: undefined,
            }),
            createSearchAfterReturnType({
              searchAfterTimes: [searchDurationB],
              errors: searchErrorsB,
            }),
          ]);
        }

        if (hasSortId) {
          const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
            buildRuleMessage,
            searchAfterSortId: sortId,
            index: inputIndexPattern,
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            logger,
            filter,
            pageSize: Math.ceil(Math.min(tuple.maxSignals, pageSize)),
            timestampOverride: ruleParams.timestampOverride,
            excludeDocsWithTimestampOverride: false,
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

          const lastSortId = searchResult.hits.hits[searchResult.hits.hits.length - 1]?.sort;
          if (lastSortId != null && lastSortId.length !== 0) {
            sortId = lastSortId[0];
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
              } was 0, exiting and moving on to next tuple`
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

          const {
            bulkCreateDuration: bulkDuration,
            createdItemsCount: createdCount,
            createdItems,
            success: bulkSuccess,
            errors: bulkErrors,
          } = await singleBulkCreate({
            buildRuleMessage,
            filteredEvents: enrichedEvents,
            ruleParams,
            services,
            logger,
            id,
            signalsIndex,
            actions,
            name,
            createdAt,
            createdBy,
            updatedAt,
            updatedBy,
            interval,
            enabled,
            refresh,
            tags,
            throttle,
          });
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
            buildRuleMessage(`filteredEvents.hits.hits: ${filteredEvents.hits.hits.length}`)
          );

          sendAlertTelemetryEvents(
            logger,
            eventsTelemetry,
            filteredEvents,
            ruleParams,
            buildRuleMessage
          );
        }

        if (!hasSortId && !hasBackupSortId) {
          logger.debug(buildRuleMessage('ran out of sort ids to sort on'));
          break;
        }
      } catch (exc: unknown) {
        logger.error(buildRuleMessage(`[-] search_after and bulk threw an error ${exc}`));
        return mergeReturns([
          toReturn,
          createSearchAfterReturnType({
            success: false,
            errors: [`${exc}`],
          }),
        ]);
      }
    }
  }
  logger.debug(buildRuleMessage(`[+] completed bulk index of ${toReturn.createdSignalsCount}`));
  toReturn.totalToFromTuples = tuplesToBeLogged;
  return toReturn;
};
