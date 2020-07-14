/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable complexity */

import moment from 'moment';

import { AlertServices } from '../../../../../alerts/server';
import { ListClient } from '../../../../../lists/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { Logger } from '../../../../../../../src/core/server';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { BuildRuleMessage } from './rule_messages';
import { SignalSearchResponse } from './types';
import { filterEventsAgainstList } from './filter_events_with_list';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { getSignalTimeTuples } from './utils';

interface SearchAfterAndBulkCreateParams {
  gap: moment.Duration | null;
  previousStartedAt: Date | null | undefined;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  listClient: ListClient | undefined; // TODO: undefined is for temporary development, remove before merged
  exceptionsList: ExceptionListItemSchema[];
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
  buildRuleMessage: BuildRuleMessage;
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
  gap,
  previousStartedAt,
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
  buildRuleMessage,
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
  const useSortIds = totalToFromTuples.length <= 1;
  logger.debug(buildRuleMessage(`totalToFromTuples: ${totalToFromTuples.length}`));
  while (totalToFromTuples.length > 0) {
    const tuple = totalToFromTuples.pop();
    if (tuple == null || tuple.to == null || tuple.from == null) {
      logger.error(buildRuleMessage(`[-] malformed date tuple`));
      toReturn.success = false;
      return toReturn;
    }
    searchResultSize = 0;
    while (searchResultSize < tuple.maxSignals) {
      try {
        logger.debug(buildRuleMessage(`sortIds: ${sortId}`));
        const {
          searchResult,
          searchDuration,
        }: { searchResult: SignalSearchResponse; searchDuration: string } = await singleSearchAfter(
          {
            searchAfterSortId: useSortIds ? sortId : undefined,
            index: inputIndexPattern,
            from: tuple.from.toISOString(),
            to: tuple.to.toISOString(),
            services,
            logger,
            filter,
            pageSize: tuple.maxSignals < pageSize ? Math.ceil(tuple.maxSignals) : pageSize, // maximum number of docs to receive per search result.
            timestampOverride: ruleParams.timestampOverride,
          }
        );
        toReturn.searchAfterTimes.push(searchDuration);

        const totalHits =
          typeof searchResult.hits.total === 'number'
            ? searchResult.hits.total
            : searchResult.hits.total.value;
        logger.debug(buildRuleMessage(`totalHits: ${totalHits}`));
        logger.debug(
          buildRuleMessage(`searchResult.hit.hits.length: ${searchResult.hits.hits.length}`)
        );
        if (totalHits === 0) {
          toReturn.success = true;
          break;
        }
        toReturn.lastLookBackDate =
          searchResult.hits.hits.length > 0
            ? new Date(
                searchResult.hits.hits[searchResult.hits.hits.length - 1]?._source['@timestamp']
              )
            : null;
        searchResultSize += searchResult.hits.hits.length;

        // filter out the search results that match with the values found in the list.
        // the resulting set are valid signals that are not on the allowlist.
        const filteredEvents: SignalSearchResponse =
          listClient != null
            ? await filterEventsAgainstList({
                listClient,
                exceptionsList,
                logger,
                eventSearchResult: searchResult,
                buildRuleMessage,
              })
            : searchResult;
        if (filteredEvents.hits.total === 0 || filteredEvents.hits.hits.length === 0) {
          // everything in the events were allowed, so no need to generate signals
          toReturn.success = true;
          break;
        }

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
        logger.debug(buildRuleMessage(`created ${createdCount} signals`));
        toReturn.createdSignalsCount += createdCount;
        if (bulkDuration) {
          toReturn.bulkCreateTimes.push(bulkDuration);
        }

        logger.debug(
          buildRuleMessage(`filteredEvents.hits.hits: ${filteredEvents.hits.hits.length}`)
        );
        if (useSortIds && filteredEvents.hits.hits[0].sort == null) {
          logger.debug(buildRuleMessage('sortIds was empty on search'));
          toReturn.success = true;
          break;
        } else if (
          useSortIds &&
          filteredEvents.hits.hits !== null &&
          filteredEvents.hits.hits[0].sort !== null
        ) {
          sortId = filteredEvents.hits.hits[0].sort
            ? filteredEvents.hits.hits[0].sort[0]
            : undefined;
        }
      } catch (exc) {
        logger.error(buildRuleMessage(`[-] search_after and bulk threw an error ${exc}`));
        toReturn.success = false;
        return toReturn;
      }
    }
  }
  logger.debug(buildRuleMessage(`[+] completed bulk index of ${toReturn.createdSignalsCount}`));
  toReturn.success = true;
  return toReturn;
};
