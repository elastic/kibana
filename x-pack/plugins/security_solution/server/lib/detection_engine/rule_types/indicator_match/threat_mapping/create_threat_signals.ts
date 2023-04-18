/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/fp/chunk';
import type { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { getThreatList, getThreatListCount } from './get_threat_list';
import type {
  CreateThreatSignalsOptions,
  CreateSignalInterface,
  GetDocumentListInterface,
} from './types';
import { createThreatSignal } from './create_threat_signal';
import { createEventSignal } from './create_event_signal';
import type { SearchAfterAndBulkCreateReturnType } from '../../types';
import {
  buildExecutionIntervalValidator,
  combineConcurrentResults,
  getMatchedFields,
} from './utils';
import { getAllowedFieldsForTermQuery } from './get_allowed_fields_for_terms_query';

import { getEventCount, getEventList } from './get_event_count';
import { getMappingFilters } from './get_mapping_filters';
import { THREAT_PIT_KEEP_ALIVE } from '../../../../../../common/cti/constants';

export const createThreatSignals = async ({
  alertId,
  bulkCreate,
  completeRule,
  concurrentSearches,
  eventsTelemetry,
  filters,
  inputIndex,
  itemsPerSearch,
  language,
  listClient,
  outputIndex,
  query,
  ruleExecutionLogger,
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
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
}: CreateThreatSignalsOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatMatchedFields = getMatchedFields(threatMapping);
  const allowedFieldsForTermsQuery = await getAllowedFieldsForTermQuery({
    services,
    threatMatchedFields,
    inputIndex,
    threatIndex,
    ruleExecutionLogger,
  });

  const params = completeRule.ruleParams;
  ruleExecutionLogger.debug('Indicator matching rule starting');
  const perPage = concurrentSearches * itemsPerSearch;
  const verifyExecutionCanProceed = buildExecutionIntervalValidator(
    completeRule.ruleConfig.schedule.interval
  );

  let results: SearchAfterAndBulkCreateReturnType = {
    success: true,
    warning: false,
    enrichmentTimes: [],
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
    tuple,
    query,
    language,
    filters: allEventFilters,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
  });

  ruleExecutionLogger.debug(`Total event count: ${eventCount}`);

  // if (eventCount === 0) {
  //   ruleExecutionLogger.debug('Indicator matching rule has completed');
  //   return results;
  // }

  let threatPitId: OpenPointInTimeResponse['id'] = (
    await services.scopedClusterClient.asCurrentUser.openPointInTime({
      index: threatIndex,
      keep_alive: THREAT_PIT_KEEP_ALIVE,
    })
  ).id;
  const reassignThreatPitId = (newPitId: OpenPointInTimeResponse['id'] | undefined) => {
    if (newPitId) threatPitId = newPitId;
  };

  const threatListCount = await getThreatListCount({
    esClient: services.scopedClusterClient.asCurrentUser,
    threatFilters: allThreatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    exceptionFilter,
  });

  ruleExecutionLogger.debug(`Total indicator items: ${threatListCount}`);

  const threatListConfig = {
    fields: threatMapping.map((mapping) => mapping.entries.map((item) => item.value)).flat(),
    _source: false,
  };

  const eventListConfig = {
    fields: threatMapping.map((mapping) => mapping.entries.map((item) => item.field)).flat(),
    _source: false,
  };

  const createSignals = async ({
    getDocumentList,
    createSignal,
    totalDocumentCount,
  }: {
    getDocumentList: GetDocumentListInterface;
    createSignal: CreateSignalInterface;
    totalDocumentCount: number;
  }) => {
    let list = await getDocumentList({ searchAfter: undefined });
    let documentCount = totalDocumentCount;

    while (list.hits.hits.length !== 0) {
      verifyExecutionCanProceed();
      const chunks = chunk(itemsPerSearch, list.hits.hits);
      ruleExecutionLogger.debug(`${chunks.length} concurrent indicator searches are starting.`);
      const concurrentSearchesPerformed =
        chunks.map<Promise<SearchAfterAndBulkCreateReturnType>>(createSignal);
      const searchesPerformed = await Promise.all(concurrentSearchesPerformed);
      results = combineConcurrentResults(results, searchesPerformed);
      documentCount -= list.hits.hits.length;
      ruleExecutionLogger.debug(
        `Concurrent indicator match searches completed with ${results.createdSignalsCount} signals found`,
        `search times of ${results.searchAfterTimes}ms,`,
        `bulk create times ${results.bulkCreateTimes}ms,`,
        `all successes are ${results.success}`
      );
      if (results.createdSignalsCount >= params.maxSignals) {
        ruleExecutionLogger.debug(
          `Indicator match has reached its max signals count ${params.maxSignals}. Additional documents not checked are ${documentCount}`
        );
        break;
      }
      ruleExecutionLogger.debug(`Documents items left to check are ${documentCount}`);

      list = await getDocumentList({
        searchAfter: list.hits.hits[list.hits.hits.length - 1].sort,
      });
    }
  };

  if (eventCount < threatListCount) {
    await createSignals({
      totalDocumentCount: eventCount,
      getDocumentList: async ({ searchAfter }) =>
        getEventList({
          services,
          ruleExecutionLogger,
          filters: allEventFilters,
          query,
          language,
          index: inputIndex,
          searchAfter,
          perPage,
          tuple,
          runtimeMappings,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          eventListConfig,
        }),

      createSignal: (slicedChunk) =>
        createEventSignal({
          alertId,
          bulkCreate,
          completeRule,
          currentEventList: slicedChunk,
          currentResult: results,
          eventsTelemetry,
          filters: allEventFilters,
          inputIndex,
          language,
          listClient,
          outputIndex,
          query,
          reassignThreatPitId,
          ruleExecutionLogger,
          savedId,
          searchAfterSize,
          services,
          threatFilters: allThreatFilters,
          threatIndex,
          threatIndicatorPath,
          threatLanguage,
          threatMapping,
          threatPitId,
          threatQuery,
          tuple,
          type,
          wrapHits,
          runtimeMappings,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          unprocessedExceptions,
          allowedFieldsForTermsQuery,
          threatMatchedFields,
        }),
    });
  } else {
    await createSignals({
      totalDocumentCount: threatListCount,
      getDocumentList: async ({ searchAfter }) =>
        getThreatList({
          esClient: services.scopedClusterClient.asCurrentUser,
          threatFilters: allThreatFilters,
          query: threatQuery,
          language: threatLanguage,
          index: threatIndex,
          searchAfter,
          ruleExecutionLogger,
          perPage,
          threatListConfig,
          pitId: threatPitId,
          reassignPitId: reassignThreatPitId,
          runtimeMappings,
          listClient,
          exceptionFilter,
        }),

      createSignal: (slicedChunk) =>
        createThreatSignal({
          alertId,
          bulkCreate,
          completeRule,
          currentResult: results,
          currentThreatList: slicedChunk,
          eventsTelemetry,
          filters: allEventFilters,
          inputIndex,
          language,
          listClient,
          outputIndex,
          query,
          ruleExecutionLogger,
          savedId,
          searchAfterSize,
          services,
          threatMapping,
          tuple,
          type,
          wrapHits,
          runtimeMappings,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          unprocessedExceptions,
          threatFilters: allThreatFilters,
          threatIndex,
          threatIndicatorPath,
          threatLanguage,
          threatPitId,
          threatQuery,
          reassignThreatPitId,
          allowedFieldsForTermsQuery,
        }),
    });
  }

  try {
    await services.scopedClusterClient.asCurrentUser.closePointInTime({ id: threatPitId });
  } catch (error) {
    // Don't fail due to a bad point in time closure. We have seen failures in e2e tests during nominal operations.
    ruleExecutionLogger.warn(
      `Error trying to close point in time: "${threatPitId}", it will expire within "${THREAT_PIT_KEEP_ALIVE}". Error is: "${error}"`
    );
  }

  ruleExecutionLogger.debug('Indicator matching rule has completed');
  return results;
};
