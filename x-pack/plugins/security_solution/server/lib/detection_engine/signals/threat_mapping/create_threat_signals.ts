/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/fp/chunk';
import { getThreatList, getThreatListCount } from './get_threat_list';

import { CreateThreatSignalsOptions, GetMatchedThreats } from './types';
import { createThreatSignal } from './create_threat_signal';
import { SearchAfterAndBulkCreateReturnType, SignalSearchResponse } from '../types';
import { combineConcurrentResults } from './utils';
import { enrichSignalThreatMatches } from './enrich_signal_threat_matches';

export const createThreatSignals = async ({
  threatMapping,
  query,
  inputIndex,
  type,
  filters,
  language,
  savedId,
  services,
  exceptionItems,
  gap,
  previousStartedAt,
  listClient,
  logger,
  eventsTelemetry,
  alertId,
  outputIndex,
  params,
  searchAfterSize,
  actions,
  createdBy,
  createdAt,
  updatedBy,
  interval,
  updatedAt,
  enabled,
  refresh,
  tags,
  throttle,
  threatFilters,
  threatQuery,
  threatLanguage,
  buildRuleMessage,
  threatIndex,
  name,
  concurrentSearches,
  itemsPerSearch,
}: CreateThreatSignalsOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  logger.debug(buildRuleMessage('Indicator matching rule starting'));
  const perPage = concurrentSearches * itemsPerSearch;

  let results: SearchAfterAndBulkCreateReturnType = {
    success: true,
    bulkCreateTimes: [],
    searchAfterTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
    createdSignals: [],
    errors: [],
  };

  let threatListCount = await getThreatListCount({
    callCluster: services.callCluster,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
  });
  logger.debug(buildRuleMessage(`Total indicator items: ${threatListCount}`));

  let threatList = await getThreatList({
    callCluster: services.callCluster,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    listClient,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
    logger,
    buildRuleMessage,
    perPage,
  });

  const getMatchedThreats: GetMatchedThreats = async (ids) => {
    // TODO should _id be a configurable field?
    const matchedThreatsFilter = {
      query: {
        bool: {
          filter: {
            ids: { values: ids },
          },
        },
      },
    };
    const threatResponse = await getThreatList({
      callCluster: services.callCluster,
      exceptionItems: exceptionItems ?? [],
      threatFilters: [...(threatFilters ?? []), matchedThreatsFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      listClient,
      searchAfter: undefined,
      sortField: undefined,
      sortOrder: undefined,
      logger,
      buildRuleMessage,
      perPage: undefined,
    });

    return threatResponse.hits.hits ?? [];
  };

  const threatEnrichment = (signals: SignalSearchResponse): Promise<SignalSearchResponse> =>
    enrichSignalThreatMatches(signals, getMatchedThreats);

  while (threatList.hits.hits.length !== 0) {
    const chunks = chunk(itemsPerSearch, threatList.hits.hits);
    logger.debug(buildRuleMessage(`${chunks.length} concurrent indicator searches are starting.`));
    const concurrentSearchesPerformed = chunks.map<Promise<SearchAfterAndBulkCreateReturnType>>(
      (slicedChunk) =>
        createThreatSignal({
          threatEnrichment,
          threatMapping,
          query,
          inputIndex,
          type,
          filters,
          language,
          savedId,
          services,
          exceptionItems,
          gap,
          previousStartedAt,
          listClient,
          logger,
          eventsTelemetry,
          alertId,
          outputIndex,
          params,
          searchAfterSize,
          actions,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt,
          interval,
          enabled,
          tags,
          refresh,
          throttle,
          buildRuleMessage,
          name,
          currentThreatList: slicedChunk,
          currentResult: results,
        })
    );
    const searchesPerformed = await Promise.all(concurrentSearchesPerformed);
    results = combineConcurrentResults(results, searchesPerformed);
    threatListCount -= threatList.hits.hits.length;
    logger.debug(
      buildRuleMessage(
        `Concurrent indicator match searches completed with ${results.createdSignalsCount} signals found`,
        `search times of ${results.searchAfterTimes}ms,`,
        `bulk create times ${results.bulkCreateTimes}ms,`,
        `all successes are ${results.success}`
      )
    );
    if (results.createdSignalsCount >= params.maxSignals) {
      logger.debug(
        buildRuleMessage(
          `Indicator match has reached its max signals count ${params.maxSignals}. Additional indicator items not checked are ${threatListCount}`
        )
      );
      break;
    }
    logger.debug(buildRuleMessage(`Indicator items left to check are ${threatListCount}`));

    threatList = await getThreatList({
      callCluster: services.callCluster,
      exceptionItems,
      query: threatQuery,
      language: threatLanguage,
      threatFilters,
      index: threatIndex,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
      sortField: undefined,
      sortOrder: undefined,
      listClient,
      buildRuleMessage,
      logger,
      perPage,
    });
  }

  logger.debug(buildRuleMessage('Indicator matching rule has completed'));
  return results;
};
