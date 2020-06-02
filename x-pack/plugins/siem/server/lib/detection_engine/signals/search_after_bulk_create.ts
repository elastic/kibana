/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerts/server';
import { ListClient } from '../../../../../lists/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes, RuleAlertParams } from '../types';
import { Logger } from '../../../../../../../src/core/server';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { SignalSearchResponse } from './types';
import { filterEventsAgainstList } from './filter_events_with_list';

interface SearchAfterAndBulkCreateParams {
  ruleParams: RuleTypeParams;
  services: AlertServices;
  listClient: ListClient | undefined; // TODO: undefined is for temporary development, remove before merged
  exceptionsList: RuleAlertParams['exceptions_list'];
  logger: Logger;
  id: string;
  inputIndexPattern: string[];
  signalsIndex: string;
  name: string;
  actions: RuleAlertAction[];
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  interval: string;
  enabled: boolean;
  pageSize: number;
  filter: unknown;
  refresh: RefreshTypes;
  tags: string[];
  throttle: string;
}

export interface SearchAfterAndBulkCreateReturnType {
  success: boolean;
  searchAfterTimes: string[];
  bulkCreateTimes: string[];
  lastLookBackDate: Date | null | undefined;
  createdSignalsCount: number;
}

// search_after through documents and re-index using bulk endpoint.
export const searchAfterAndBulkCreate = async ({
  ruleParams,
  exceptionsList,
  services,
  listClient,
  logger,
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
}: SearchAfterAndBulkCreateParams): Promise<SearchAfterAndBulkCreateReturnType> => {
  const toReturn: SearchAfterAndBulkCreateReturnType = {
    success: false,
    searchAfterTimes: [],
    bulkCreateTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
  };

  let sortId; // tells us where to start our next search_after query
  let searchResultSize = 0;

  /*
    The purpose of `maxResults` is to ensure we do not perform
    extra search_after's. This will be reset on each
    iteration, although it really only matters for the first
    iteration of the loop.
    e.g. if maxSignals = 100 but our search result only yields
    27 documents, there is no point in performing another search
    since we know there are no more events that match our rule,
    and thus, no more signals we could possibly generate.
    However, if maxSignals = 500 and our search yields a total
    of 3050 results we don't want to make 3050 signals,
    we only want 500. So maxResults will help us control how
    many times we perform a search_after
  */
  let maxResults = ruleParams.maxSignals;

  // Get

  while (searchResultSize < maxResults) {
    try {
      logger.debug(`sortIds: ${sortId}`);
      const {
        searchResult,
        searchDuration,
      }: { searchResult: SignalSearchResponse; searchDuration: string } = await singleSearchAfter({
        searchAfterSortId: sortId,
        index: inputIndexPattern,
        from: ruleParams.from,
        to: ruleParams.to,
        services,
        logger,
        filter,
        pageSize, // maximum number of docs to receive per search result.
      });
      toReturn.searchAfterTimes.push(searchDuration);
      toReturn.lastLookBackDate =
        searchResult.hits.hits.length > 0
          ? new Date(
              searchResult.hits.hits[searchResult.hits.hits.length - 1]?._source['@timestamp']
            )
          : null;
      const totalHits =
        typeof searchResult.hits.total === 'number'
          ? searchResult.hits.total
          : searchResult.hits.total.value;
      logger.debug(`totalHits: ${totalHits}`);

      // re-calculate maxResults to ensure if our search results
      // are less than max signals, we are not attempting to
      // create more signals than there are total search results.
      maxResults = Math.min(totalHits, ruleParams.maxSignals);
      searchResultSize += searchResult.hits.hits.length;
      if (searchResult.hits.hits.length === 0) {
        toReturn.success = true;
        return toReturn;
      }

      // filter out the search results that match with the values found in the list.
      // the resulting set are valid signals that are not on the allowlist.
      const filteredEvents =
        listClient != null
          ? await filterEventsAgainstList({
              listClient,
              exceptionsList,
              logger,
              eventSearchResult: searchResult,
            })
          : searchResult;

      if (filteredEvents.hits.hits.length === 0) {
        // everything in the events were allowed, so no need to generate signals
        toReturn.success = true;
        return toReturn;
      }

      // cap max signals created to be no more than maxSignals
      if (toReturn.createdSignalsCount + filteredEvents.hits.hits.length > ruleParams.maxSignals) {
        const tempSignalsToIndex = filteredEvents.hits.hits.slice(
          0,
          ruleParams.maxSignals - toReturn.createdSignalsCount
        );
        filteredEvents.hits.hits = tempSignalsToIndex;
      }
      logger.debug('next bulk index');
      const {
        bulkCreateDuration: bulkDuration,
        createdItemsCount: createdCount,
      } = await singleBulkCreate({
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
      logger.debug('finished next bulk index');
      logger.debug(`created ${createdCount} signals`);
      toReturn.createdSignalsCount += createdCount;
      if (bulkDuration) {
        toReturn.bulkCreateTimes.push(bulkDuration);
      }

      if (filteredEvents.hits.hits[0].sort == null) {
        logger.debug('sortIds was empty on search');
        toReturn.success = true;
        return toReturn; // no more search results
      }
      sortId = filteredEvents.hits.hits[0].sort[0];
    } catch (exc) {
      logger.error(`[-] search_after and bulk threw an error ${exc}`);
      toReturn.success = false;
      return toReturn;
    }
  }
  logger.debug(`[+] completed bulk index of ${toReturn.createdSignalsCount}`);
  toReturn.success = true;
  return toReturn;
};
