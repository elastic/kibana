/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getFilter } from '../get_filter';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import { buildReasonMessageForThreatMatchAlert } from '../reason_formatters';
import type { CreateEventSignalOptions } from './types';
import type { SearchAfterAndBulkCreateReturnType, SignalSourceHit } from '../types';
import { getThreatList } from './get_threat_list';
import { enrichSignalThreatMatchesFromSignalsMap } from './enrich_signal_threat_matches';
import { getSignalsMatchesFromThreatIndex } from './get_signal_matches_from_threat_index';

export const createEventSignal = async ({
  bulkCreate,
  currentResult,
  currentEventList,
  eventsTelemetry,
  filters,
  inputIndex,
  language,
  listClient,
  query,
  ruleExecutionLogger,
  savedId,
  searchAfterSize,
  services,
  threatMapping,
  tuple,
  type,
  wrapHits,
  threatQuery,
  threatFilters,
  threatLanguage,
  threatIndex,
  threatIndicatorPath,
  threatPitId,
  reassignThreatPitId,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
}: CreateEventSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentEventList,
    entryKey: 'field',
  });

  if (!threatFilter.query || threatFilter.query?.bool.should.length === 0) {
    // empty event list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    ruleExecutionLogger.debug(
      'Indicator items are empty after filtering for missing data, returning without attempting a match'
    );
    return currentResult;
  } else {
    const threatSearchParams = {
      esClient: services.scopedClusterClient.asCurrentUser,
      threatFilters: [...threatFilters, threatFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      ruleExecutionLogger,
      threatListConfig: {
        _source: false,
        fields: undefined,
      },
      pitId: threatPitId,
      reassignPitId: reassignThreatPitId,
      runtimeMappings,
      listClient,
      exceptionFilter,
    };

    const signalsMap = await getSignalsMatchesFromThreatIndex({
      threatSearchParams,
      eventsCount: currentEventList.length,
    });

    const ids = Array.from(signalsMap.keys());
    const indexFilter = {
      query: {
        bool: {
          filter: {
            ids: { values: ids },
          },
        },
      },
    };

    const esFilter = await getFilter({
      type,
      filters: [...filters, indexFilter],
      language,
      query,
      savedId,
      services,
      index: inputIndex,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(`${ids?.length} matched signals found`);

    const threatEnrichment = (signals: SignalSourceHit[]): Promise<SignalSourceHit[]> => {
      const buildThreatEnrichment = async () => {
        const threatIds = signals
          .map((s) => s._id)
          .reduce<string[]>((acc, id) => {
            return [
              ...new Set([
                ...acc,
                ...(signalsMap.get(id) ?? []).map((threatQueryMatched) => threatQueryMatched.id),
              ]),
            ];
          }, [])
          .flat();

        const matchedThreatsFilter = {
          query: {
            bool: {
              filter: {
                ids: { values: threatIds },
              },
            },
          },
        };

        const threatResponse = await getThreatList({
          ...threatSearchParams,
          threatListConfig: {
            _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
            fields: undefined,
          },
          threatFilters: [...threatFilters, matchedThreatsFilter],
          searchAfter: undefined,
        });

        return threatResponse.hits.hits;
      };
      return enrichSignalThreatMatchesFromSignalsMap(
        signals,
        buildThreatEnrichment,
        threatIndicatorPath,
        signalsMap
      );
    };

    const result = await searchAfterAndBulkCreate({
      buildReasonMessage: buildReasonMessageForThreatMatchAlert,
      bulkCreate,
      enrichment: threatEnrichment,
      eventsTelemetry,
      exceptionsList: unprocessedExceptions,
      filter: esFilter,
      inputIndexPattern: inputIndex,
      listClient,
      pageSize: searchAfterSize,
      ruleExecutionLogger,
      services,
      sortOrder: 'desc',
      trackTotalHits: false,
      tuple,
      wrapHits,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    });

    ruleExecutionLogger.debug(
      `${
        threatFilter.query?.bool.should.length
      } items have completed match checks and the total times to search were ${
        result.searchAfterTimes.length !== 0 ? result.searchAfterTimes : '(unknown) '
      }ms`
    );
    return result;
  }
};
