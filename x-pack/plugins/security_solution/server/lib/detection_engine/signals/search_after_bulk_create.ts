/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable complexity */

import { isEmpty } from 'lodash';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { filterEventsAgainstList } from './filters/filter_events_against_list';
import { sendAlertTelemetryEvents } from './send_telemetry_events';
import {
  createSearchAfterReturnType,
  createSearchAfterReturnTypeFromResponse,
  createTotalHitsFromSearchResult,
  getSignalTimeTuples,
  mergeReturns,
} from './utils';
import { SearchAfterAndBulkCreateParams, SearchAfterAndBulkCreateReturnType } from './types';
import { TotalValue } from '../../../../common/detection_engine/types';

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
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  let toReturn = createSearchAfterReturnType();

  // sortId tells us where to start our next consecutive search_after query
  let sortId: string | undefined;
  let backupSortId: string | undefined;

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
        logger.debug(buildRuleMessage(`sortIds: ${sortId}`));

        // perform search_after with optionally undefined sortId
        const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
          buildRuleMessage,
          searchAfterSortId: sortId,
          index: inputIndexPattern,
          from: tuple.from.toISOString(),
          to: tuple.to.toISOString(),
          services,
          logger,
          filter,
          pageSize: tuple.maxSignals < pageSize ? Math.ceil(tuple.maxSignals) : pageSize, // maximum number of docs to receive per search result.
          timestampOverride: ruleParams.timestampOverride,
          excludeDocsWithTimestampOverride: false,
        });
        toReturn = mergeReturns([
          toReturn,
          createSearchAfterReturnTypeFromResponse({
            searchResult,
            timestampOverride: ruleParams.timestampOverride,
          }),
          createSearchAfterReturnType({
            searchAfterTimes: [searchDuration],
            errors: searchErrors,
          }),
        ]);

        // if there is a timestampOverride param we always want to do a secondary search against @timestamp
        if (ruleParams.timestampOverride != null) {
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
            pageSize: tuple.maxSignals < pageSize ? Math.ceil(tuple.maxSignals) : pageSize, // maximum number of docs to receive per search result.
            timestampOverride: ruleParams.timestampOverride,
            excludeDocsWithTimestampOverride: true,
          });

          // call this function setSortIdOrExit()
          const lastSortId = searchResultB?.hits?.hits[searchResultB.hits.hits.length - 1]?.sort;
          if (lastSortId != null && lastSortId.length !== 0) {
            backupSortId = lastSortId[0];
          } else if (lastSortId == null && isEmpty(searchResult.hits.hits)) {
            // if no sort id on backup search and the initial search result was also empty; break
            logger.debug(buildRuleMessage('backupSortIds was empty on searchResultB'));
            break;
          }
          searchResult.hits.hits.push(...searchResultB.hits.hits);

          // we have to update the hits.total to include these newfound values.
          // sometimes hits.total is a value (number) or sometimes its an object
          const totalTypeGuard = (num: number | TotalValue): num is number =>
            typeof num === 'number';
          if (totalTypeGuard(searchResult.hits.total)) {
            if (totalTypeGuard(searchResultB.hits.total)) {
              searchResult.hits.total += searchResultB.hits.total;
            } else {
              searchResult.hits.total += searchResultB.hits.total.value;
            }
          } else {
            if (totalTypeGuard(searchResultB.hits.total)) {
              searchResult.hits.total.value += searchResultB.hits.total;
            } else {
              searchResult.hits.total.value += searchResultB.hits.total.value;
            }
          }

          // merge the search result from the secondary search with the first
          toReturn = mergeReturns([
            toReturn,
            createSearchAfterReturnTypeFromResponse({
              searchResult: searchResultB,
              timestampOverride: undefined,
            }),
            createSearchAfterReturnType({
              searchAfterTimes: [searchDurationB],
              errors: searchErrorsB,
            }),
          ]);
        }

        // determine if there are any candidate signals to be processed
        const totalHits = createTotalHitsFromSearchResult({ searchResult });
        logger.debug(buildRuleMessage(`totalHits: ${totalHits}`));
        logger.debug(
          buildRuleMessage(`searchResult.hit.hits.length: ${searchResult.hits.hits.length}`)
        );

        // search results yielded zero hits so exit
        // with search_after, these two values can be different when
        // searching with the last sortId of a consecutive search_after
        // yields zero hits, but there were hits using the previous
        // sortIds.
        // e.g. totalHits was 156, index 50 of 100 results, do another search-after
        // this time with a new sortId, index 22 of the remaining 56, get another sortId
        // search with that sortId, total is still 156 but the hits.hits array is empty.
        if (totalHits === 0 || searchResult.hits.hits.length === 0) {
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
          eventSearchResult: searchResult,
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
          const {
            bulkCreateDuration: bulkDuration,
            createdItemsCount: createdCount,
            createdItems,
            success: bulkSuccess,
            errors: bulkErrors,
          } = await singleBulkCreate({
            buildRuleMessage,
            filteredEvents,
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

        // we are guaranteed to have searchResult hits at this point
        // because we check before if the totalHits or
        // searchResult.hits.hits.length is 0
        // call this function setSortIdOrExit()
        const lastSortId = searchResult.hits.hits[searchResult.hits.hits.length - 1].sort;
        if (lastSortId != null && lastSortId.length !== 0) {
          sortId = lastSortId[0];
        } else {
          logger.debug(buildRuleMessage('sortIds was empty on searchResult'));
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
  return toReturn;
};
