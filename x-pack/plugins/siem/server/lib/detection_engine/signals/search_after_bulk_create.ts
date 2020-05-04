/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListClientType } from '../../../../../lists/server';
import { AlertServices } from '../../../../../alerting/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { Logger } from '../../../../../../../src/core/server';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { SignalSearchResponse } from './types';
import { BuildRuleMessage } from './rule_messages';
import { filterEventsAgainstList } from './filter_events_with_list';

interface SearchAfterAndBulkCreateParams {
  ruleParams: RuleTypeParams;
  services: AlertServices;
  listClient: ListClientType; // for now....
  listValueType: string;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
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
  services,
  listClient,
  logger,
  buildRuleMessage,
  listValueType,
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

  let sortId;

  while (toReturn.createdSignalsCount < ruleParams.maxSignals) {
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
      const totalHits =
        typeof searchResult.hits.total === 'number'
          ? searchResult.hits.total
          : searchResult.hits.total.value;
      logger.debug(`totalHits: ${totalHits}`);
      if (searchResult.hits.hits.length === 0) {
        toReturn.success = true;
        return toReturn;
      }

      // filter out the search results that match with the values found in the list.
      // the resulting set are valid signals that are not on the allowlist.
      const filteredEvents = await filterEventsAgainstList({
        listClient,
        eventSearchResult: searchResult,
        type: listValueType,
      });
      if (filteredEvents != null && filteredEvents.hits.hits.length === 0) {
        // everything in the events were allowed, so no need to generate signals
        // return
        toReturn.success = true;
        return toReturn;
      }

      if (filteredEvents?.hits?.hits[0]?.sort == null) {
        logger.debug('sortIds was empty on search');
        toReturn.success = true;
        return toReturn; // no more search results
      }
      sortId = filteredEvents.hits.hits[0].sort[0];
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
      toReturn.createdSignalsCount += createdCount;
      if (bulkDuration) {
        toReturn.bulkCreateTimes.push(bulkDuration);
      }
      if (totalHits < ruleParams.maxSignals) {
        toReturn.success = true;
        return toReturn;
      }
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
