/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/fp/chunk';
import { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { getThreatListFunc, getThreatListCount } from './get_threat_list';
import { CreateThreatSignalsOptions } from './types';
import { createThreatSignal } from './create_threat_signal';
import { SearchAfterAndBulkCreateReturnType } from '../types';
import { buildExecutionIntervalValidator, combineConcurrentResults } from './utils';
import { buildThreatEnrichment } from './build_threat_enrichment';
import { getEventCount } from './get_event_count';
import { getMappingFilters } from './get_mapping_filters';
import { THREAT_PIT_KEEP_ALIVE } from '../../../../../common/cti/constants';

export const createThreatSignals = async ({
  alertId,
  buildRuleMessage,
  bulkCreate,
  completeRule,
  eventsTelemetry,
  exceptionItems,
  filters,
  inputIndex,
  itemsPerSearch,
  language,
  listClient,
  logger,
  outputIndex,
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
  const params = completeRule.ruleParams;
  logger.debug(buildRuleMessage('Indicator matching rule starting'));
  const verifyExecutionCanProceed = buildExecutionIntervalValidator(
    completeRule.ruleConfig.schedule.interval
  );

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

  const { eventMappingFilter, indicatorMappingFilter } = getMappingFilters(threatMapping);
  const allEventFilters = [...filters, eventMappingFilter];
  const allThreatFilters = [...threatFilters, indicatorMappingFilter];

  const eventCount = await getEventCount({
    esClient: services.scopedClusterClient.asCurrentUser,
    index: inputIndex,
    exceptionItems,
    tuple,
    query,
    language,
    filters: allEventFilters,
  });

  logger.debug(`Total event count: ${eventCount}`);

  if (eventCount === 0) {
    logger.debug(buildRuleMessage('Indicator matching rule has completed'));
    return results;
  }

  const pitId: OpenPointInTimeResponse['id'] = (
    await services.scopedClusterClient.asCurrentUser.openPointInTime({
      index: threatIndex,
      keep_alive: THREAT_PIT_KEEP_ALIVE,
    })
  ).id;

  const getThreatList = getThreatListFunc(pitId);

  let threatListCount = await getThreatListCount({
    esClient: services.scopedClusterClient.asCurrentUser,
    exceptionItems,
    threatFilters: allThreatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
  });

  logger.debug(buildRuleMessage(`Total indicator items: ${threatListCount}`));

  const threatListConfig = {
    fields: threatMapping.map((mapping) => mapping.entries.map((item) => item.value)).flat(),
    _source: false,
  };

  let threatList = await getThreatList({
    esClient: services.scopedClusterClient.asCurrentUser,
    exceptionItems,
    threatFilters: allThreatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    searchAfter: undefined,
    logger,
    buildRuleMessage,
    threatListConfig,
  });

  const threatEnrichment = buildThreatEnrichment({
    buildRuleMessage,
    exceptionItems,
    logger,
    services,
    threatFilters: allThreatFilters,
    threatIndex,
    threatIndicatorPath,
    threatLanguage,
    threatQuery,
    getThreatList,
  });

  while (threatList.hits.hits.length !== 0) {
    verifyExecutionCanProceed();
    const chunks = chunk(itemsPerSearch, threatList.hits.hits);
    logger.debug(buildRuleMessage(`${chunks.length} concurrent indicator searches are starting.`));
    const concurrentSearchesPerformed = chunks.map<Promise<SearchAfterAndBulkCreateReturnType>>(
      (slicedChunk) =>
        createThreatSignal({
          alertId,
          buildRuleMessage,
          bulkCreate,
          completeRule,
          currentResult: results,
          currentThreatList: slicedChunk,
          eventsTelemetry,
          exceptionItems,
          filters: allEventFilters,
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
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      query: threatQuery,
      language: threatLanguage,
      threatFilters: allThreatFilters,
      index: threatIndex,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
      buildRuleMessage,
      logger,
      threatListConfig,
    });
  }

  try {
    await services.scopedClusterClient.asCurrentUser.closePointInTime({ id: pitId });
  } catch (error) {
    // Don't fail due to a bad point in time closure. We have seen failures in e2e tests during nominal operations.
    logger.warn(
      `Error trying to close point in time: "${pitId}", it will expire within "${THREAT_PIT_KEEP_ALIVE}". Error is: "${error}"`
    );
  }

  logger.debug(buildRuleMessage('Indicator matching rule has completed'));
  return results;
};
