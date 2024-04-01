/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { isEmpty } from 'lodash';

import type { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { uniq, chunk } from 'lodash/fp';
import { getThreatList, getThreatListCount } from './get_threat_list';
import type {
  CreateThreatSignalsOptions,
  CreateSignalInterface,
  GetDocumentListInterface,
} from './types';
import { createThreatSignal } from './create_threat_signal';
import { createEventSignal } from './create_event_signal';
import type { SearchAfterAndBulkCreateReturnType } from '../../types';
import { MAX_SIGNALS_SUPPRESSION_MULTIPLIER } from '../../constants';
import {
  buildExecutionIntervalValidator,
  combineConcurrentResults,
  getMatchedFields,
} from './utils';
import { getAllowedFieldsForTermQuery } from './get_allowed_fields_for_terms_query';

import { getEventCount, getEventList } from './get_event_count';
import { getMappingFilters } from './get_mapping_filters';
import { THREAT_PIT_KEEP_ALIVE } from '../../../../../../common/cti/constants';
import { getMaxSignalsWarning } from '../../utils/utils';
import { getFieldsForWildcard } from '../../utils/get_fields_for_wildcard';

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
  wrapSuppressedHits,
  runOpts,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
  inputIndexFields,
  licensing,
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
    suppressedAlertsCount: 0,
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
    indexFields: inputIndexFields,
  });

  ruleExecutionLogger.debug(`Total event count: ${eventCount}`);

  let threatPitId: OpenPointInTimeResponse['id'] = (
    await services.scopedClusterClient.asCurrentUser.openPointInTime({
      index: threatIndex,
      keep_alive: THREAT_PIT_KEEP_ALIVE,
    })
  ).id;
  const reassignThreatPitId = (newPitId: OpenPointInTimeResponse['id'] | undefined) => {
    if (newPitId) threatPitId = newPitId;
  };

  const threatIndexFields = await getFieldsForWildcard({
    index: threatIndex,
    language: threatLanguage ?? 'kuery',
    dataViews: services.dataViews,
    ruleExecutionLogger,
  });

  const threatListCount = await getThreatListCount({
    esClient: services.scopedClusterClient.asCurrentUser,
    threatFilters: allThreatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    exceptionFilter,
    indexFields: threatIndexFields,
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

    let chunkPage = itemsPerSearch;

    while (list.hits.hits.length !== 0) {
      verifyExecutionCanProceed();
      // refactor calculating the chunks
      // should be parameterized to allow re-running createSignal map
      // isn't there a Promise function that returns early once an error occurs?
      const chunks = chunk(chunkPage, list.hits.hits);
      ruleExecutionLogger.debug(`${chunks.length} concurrent indicator searches are starting.`);
      const concurrentSearchesPerformed =
        chunks.map<Promise<SearchAfterAndBulkCreateReturnType>>(createSignal);

      const searchesPerformed = await Promise.all(concurrentSearchesPerformed);

      // Did our searches fail with an error containing the maxClauseCount
      // error message?

      const maxClauseCountValue = searchesPerformed.reduce<number>((acc, search) => {
        const failureMessage: string | undefined = search.errors.find((err) =>
          err.includes('failed to create query: maxClauseCount is set to')
        );

        const regex = /[0-9]/g;
        const found = failureMessage?.match(regex);

        if (!isEmpty(found) && found != null) {
          return parseInt(found.join(''), 10);
        } else {
          return acc;
        }
      }, -1);

      if (maxClauseCountValue > 0) {
        // parse the error message to acquire the maximum available clauses
        // allowed by elasticsearch

        chunkPage = maxClauseCountValue - 1;
        results = combineConcurrentResults(
          results,
          searchesPerformed.filter((search) =>
            search.errors.some(
              (err) => !err.includes('failed to create query: maxClauseCount is set to')
            )
          )
        );
      } else {
        results = combineConcurrentResults(results, searchesPerformed);
      }
      documentCount -= list.hits.hits.length;
      ruleExecutionLogger.debug(
        `Concurrent indicator match searches completed with ${results.createdSignalsCount} signals found`,
        `search times of ${results.searchAfterTimes}ms,`,
        `bulk create times ${results.bulkCreateTimes}ms,`,
        `all successes are ${results.success}`
      );

      // if alerts suppressed it means suppression enabled, so suppression alert limit should be applied (5 * max_signals)
      if (results.createdSignalsCount >= params.maxSignals) {
        if (results.warningMessages.includes(getMaxSignalsWarning())) {
          results.warningMessages = uniq(results.warningMessages);
        } else if (documentCount > 0) {
          results.warningMessages.push(getMaxSignalsWarning());
        }
        ruleExecutionLogger.debug(
          `Indicator match has reached its max signals count ${params.maxSignals}. Additional documents not checked are ${documentCount}`
        );
        break;
      } else if (
        results.suppressedAlertsCount &&
        results.suppressedAlertsCount > 0 &&
        results.suppressedAlertsCount + results.createdSignalsCount >=
          MAX_SIGNALS_SUPPRESSION_MULTIPLIER * params.maxSignals
      ) {
        // warning should be already set
        ruleExecutionLogger.debug(
          `Indicator match has reached its max signals count ${
            MAX_SIGNALS_SUPPRESSION_MULTIPLIER * params.maxSignals
          }. Additional documents not checked are ${documentCount}`
        );
        break;
      }
      ruleExecutionLogger.debug(`Documents items left to check are ${documentCount}`);
      if (maxClauseCountValue > 0) {
        ruleExecutionLogger.debug(`Re-running search since we hit max clause count error`);

        // re-run search with smaller max clause count;
        list = await getDocumentList({ searchAfter: undefined });
        documentCount = totalDocumentCount;
      } else {
        list = await getDocumentList({
          searchAfter: list.hits.hits[list.hits.hits.length - 1].sort,
        });
      }
    }
  };

  const license = await firstValueFrom(licensing.license$);
  const hasPlatinumLicense = license.hasAtLeast('platinum');
  const isAlertSuppressionConfigured = Boolean(
    completeRule.ruleParams.alertSuppression?.groupBy?.length
  );

  const isAlertSuppressionActive = isAlertSuppressionConfigured && hasPlatinumLicense;

  // alert suppression needs to be performed on results searched in ascending order, so alert's suppression boundaries would be set correctly
  // at the same time, there are concerns on performance of IM rule when sorting is set to asc, as it may lead to longer rule runs, since it will
  // first go through alerts that might ve been processed in earlier executions, when look back interval set to large values (it can't be larger than 24h)
  const sortOrder = isAlertSuppressionConfigured ? 'asc' : 'desc';

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
          indexFields: inputIndexFields,
          sortOrder,
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
          wrapSuppressedHits,
          runtimeMappings,
          primaryTimestamp,
          secondaryTimestamp,
          exceptionFilter,
          unprocessedExceptions,
          allowedFieldsForTermsQuery,
          threatMatchedFields,
          inputIndexFields,
          threatIndexFields,
          runOpts,
          sortOrder,
          isAlertSuppressionActive,
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
          indexFields: threatIndexFields,
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
          wrapSuppressedHits,
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
          inputIndexFields,
          threatIndexFields,
          runOpts,
          sortOrder,
          isAlertSuppressionActive,
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
