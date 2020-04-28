/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerting/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { Logger } from '../../../../../../../src/core/server';
import { singleSearchAfter } from './single_search_after';
import { singleBulkCreate } from './single_bulk_create';
import { SignalSearchResponse } from './types';

interface SearchAfterAndBulkCreateParams {
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices;
  // listClient: ListServices; // for now....
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
  someResult,
  ruleParams,
  services,
  // listClient,
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
  if (someResult.hits.hits.length === 0) {
    toReturn.success = true;
    return toReturn;
  }

  logger.debug('[+] starting bulk insertion');
  const { bulkCreateDuration, createdItemsCount } = await singleBulkCreate({
    someResult,
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

  if (createdItemsCount > 0) {
    toReturn.createdSignalsCount = createdItemsCount;
    toReturn.lastLookBackDate =
      someResult.hits.hits.length > 0
        ? new Date(someResult.hits.hits[someResult.hits.hits.length - 1]?._source['@timestamp'])
        : null;
  }

  if (bulkCreateDuration) {
    toReturn.bulkCreateTimes.push(bulkCreateDuration);
  }
  const totalHits =
    typeof someResult.hits.total === 'number' ? someResult.hits.total : someResult.hits.total.value;
  // maxTotalHitsSize represents the total number of docs to
  // query for, no matter the size of each individual page of search results.
  // If the total number of hits for the overall search result is greater than
  // maxSignals, default to requesting a total of maxSignals, otherwise use the
  // totalHits in the response from the searchAfter query.
  const maxTotalHitsSize = Math.min(totalHits, ruleParams.maxSignals);

  // number of docs in the current search result
  let hitsSize = someResult.hits.hits.length;
  logger.debug(`first size: ${hitsSize}`);
  let sortIds = someResult.hits.hits[0].sort;
  if (sortIds == null && totalHits > 0) {
    logger.error('sortIds was empty on first search but expected more');
    toReturn.success = false;
    return toReturn;
  } else if (sortIds == null && totalHits === 0) {
    toReturn.success = true;
    return toReturn;
  }
  let sortId;
  if (sortIds != null) {
    sortId = sortIds[0];
  }
  while (hitsSize < maxTotalHitsSize && hitsSize !== 0) {
    try {
      logger.debug(`sortIds: ${sortIds}`);
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
      if (searchResult.hits.hits.length === 0) {
        toReturn.success = true;
        return toReturn;
      }
      hitsSize += searchResult.hits.hits.length;
      logger.debug(`size adjusted: ${hitsSize}`);
      sortIds = searchResult.hits.hits[0].sort;
      if (sortIds == null) {
        logger.debug('sortIds was empty on search');
        toReturn.success = true;
        return toReturn; // no more search results
      }
      sortId = sortIds[0];
      logger.debug('next bulk index');
      const {
        bulkCreateDuration: bulkDuration,
        createdItemsCount: createdCount,
      } = await singleBulkCreate({
        someResult: searchResult,
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
    } catch (exc) {
      logger.error(`[-] search_after and bulk threw an error ${exc}`);
      toReturn.success = false;
      return toReturn;
    }
  }
  logger.debug(`[+] completed bulk index of ${maxTotalHitsSize}`);
  toReturn.success = true;
  return toReturn;
};
