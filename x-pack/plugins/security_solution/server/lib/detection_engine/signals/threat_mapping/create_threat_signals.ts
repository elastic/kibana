/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/fp/chunk';
import { getTotalEventCount, getFirstIndicatorPage, getNextIndicatorPage } from './get_threat_list';

import { CreateThreatSignalsOptions } from './types';
import { createThreatSignal } from './create_threat_signal';
import { SearchAfterAndBulkCreateReturnType } from '../types';
import { buildExecutionIntervalValidator, combineConcurrentResults } from './utils';
import { buildThreatEnrichment } from './build_threat_enrichment';

export const createThreatSignals = async ({
  alertId,
  buildRuleMessage,
  bulkCreate,
  completeRule,
  concurrentSearches,
  eventsTelemetry,
  exceptionItems,
  filters,
  inputIndex,
  itemsPerSearch,
  language,
  listClient,
  logger,
  outputIndex,
  percolatorRuleDataClient,
  query,
  savedId,
  searchAfterSize,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatMapping,
  threatQuery,
  tuple,
  type,
  wrapHits,
}: CreateThreatSignalsOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const logDebugMessage = (message: string) => logger.debug(buildRuleMessage(message));
  logDebugMessage('Indicator matching rule starting');
  const perPage = concurrentSearches * itemsPerSearch;
  const maxSignals = completeRule.ruleParams.maxSignals;
  const withTimeout = async <T>(func: () => Promise<T>) => {
    const resolved = await func();
    buildExecutionIntervalValidator(completeRule.ruleConfig.schedule.interval);
    return resolved;
  };

  let results: SearchAfterAndBulkCreateReturnType = {
    success: true,
    warning: false,
    bulkCreateTimes: [],
    searchAfterTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
    createdSignals: [],
    errors: [],
    warningMessages: [],
  };

  // TODO: totalEventCount queries events from all time, but what we really need is just the events from the last execution
  const matchableSourceEventCount = await withTimeout<number>(() =>
    getTotalEventCount({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      filters,
      query,
      language,
      index: inputIndex,
    })
  );
  logDebugMessage(`matchable source event count from all time: ${matchableSourceEventCount}`);
  console.log('____threatCount', matchableSourceEventCount);

  const matchableIndicatorEventCount = await withTimeout<number>(() =>
    getTotalEventCount({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      filters: threatFilters,
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
    })
  );
  logDebugMessage(`matchable indicator event count from all time: ${matchableIndicatorEventCount}`);
  console.log('____threatCount', matchableIndicatorEventCount);

  if (matchableSourceEventCount && matchableIndicatorEventCount) {
    let indicatorEventsLeftToProcess = matchableIndicatorEventCount;

    let currentIndicatorPage = await getFirstIndicatorPage({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      threatFilters,
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      listClient,
      logger,
      buildRuleMessage,
      perPage,
    });

    const threatEnrichment = buildThreatEnrichment({
      buildRuleMessage,
      exceptionItems,
      listClient,
      logger,
      services,
      threatFilters,
      threatIndex,
      threatIndicatorPath,
      threatLanguage,
      threatQuery,
    });

    let loopCount = 0;

    while (currentIndicatorPage.hits.hits.length !== 0) {
      console.log('______loopCount', loopCount);
      const chunks = chunk(itemsPerSearch, currentIndicatorPage.hits.hits);
      console.log('______chunkCount', chunks.length);
      logDebugMessage(`${chunks.length} concurrent indicator searches are starting.`);
      const concurrentSearchesPerformed = chunks.map<Promise<SearchAfterAndBulkCreateReturnType>>(
        (slicedChunk) => {
          return createThreatSignal({
            alertId,
            buildRuleMessage,
            bulkCreate,
            completeRule,
            currentResult: results,
            currentThreatList: slicedChunk,
            eventsTelemetry,
            exceptionItems,
            filters,
            inputIndex,
            language,
            listClient,
            logger,
            outputIndex,
            query,
            savedId,
            searchAfterSize,
            services,
            threatEnrichment,
            threatMapping,
            tuple,
            type,
            wrapHits,
          });
        }
      );
      const searchesPerformed = await Promise.all(concurrentSearchesPerformed);
      results = combineConcurrentResults(results, searchesPerformed);
      indicatorEventsLeftToProcess -= currentIndicatorPage.hits.hits.length;
      logger.debug(
        buildRuleMessage(
          `Concurrent indicator match searches completed with ${results.createdSignalsCount} signals found`,
          `search times of ${results.searchAfterTimes}ms,`,
          `bulk create times ${results.bulkCreateTimes}ms,`,
          `all successes are ${results.success}`
        )
      );
      if (results.createdSignalsCount >= maxSignals) {
        logDebugMessage(
          `Indicator match has reached its max signals count ${maxSignals}. Additional indicator items not checked are ${indicatorEventsLeftToProcess}`
        );
        break;
      }
      logDebugMessage(`Indicator items left to check are ${indicatorEventsLeftToProcess}`);

      currentIndicatorPage = await getNextIndicatorPage({
        esClient: services.scopedClusterClient.asCurrentUser,
        exceptionItems,
        query: threatQuery,
        language: threatLanguage,
        threatFilters,
        index: threatIndex,
        // @ts-expect-error@elastic/elasticsearch SearchSortResults might contain null
        searchAfter: currentIndicatorPage.hits.hits[currentIndicatorPage.hits.hits.length - 1].sort,
        sortField: undefined,
        sortOrder: undefined,
        listClient,
        buildRuleMessage,
        logger,
        perPage,
      });
      loopCount++;
    }
  }

  logDebugMessage('Indicator matching rule has completed');
  return results;
};
