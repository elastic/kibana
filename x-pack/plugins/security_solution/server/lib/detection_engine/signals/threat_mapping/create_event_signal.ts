/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getFilter } from '../get_filter';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import { buildReasonMessageForThreatMatchAlert } from '../reason_formatters';
import type { CreateEventSignalOptions, SignalValuesMap } from './types';
import type { SearchAfterAndBulkCreateReturnType, SignalSourceHit } from '../types';
import { getAllThreatListHits } from './get_threat_list';
import {
  enrichSignalThreatMatches,
  getSignalMatchesFromThreatList,
} from './enrich_signal_threat_matches';

export const createEventSignal = async ({
  alertId,
  bulkCreate,
  completeRule,
  currentResult,
  currentEventList,
  eventsTelemetry,
  filters,
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
  allowedFieldsForTermsQuery,
  threatMatchedFields,
}: CreateEventSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const signalValueMap: SignalValuesMap = currentEventList.reduce<SignalValuesMap>((acc, event) => {
    threatMatchedFields.source.forEach((field) => {
      const fieldValue = get(event.fields, field)?.[0];
      if (!acc[field]) {
        acc[field] = {};
      }
      if (!acc[field][fieldValue]) {
        acc[field][fieldValue] = [];
      }
      acc[field][fieldValue].push(event._id);
    });
    return acc;
  }, {});

  console.log('singnalValueMap', JSON.stringify(signalValueMap, null, 2));
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentEventList,
    entryKey: 'field',
    allowedFieldsForTermsQuery,
  });

  console.log(JSON.stringify(threatFilter));

  if (!threatFilter.query || threatFilter.query?.bool.should.length === 0) {
    // empty event list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    ruleExecutionLogger.debug(
      'Indicator items are empty after filtering for missing data, returning without attempting a match'
    );
    return currentResult;
  } else {
    const threatListHits = await getAllThreatListHits({
      esClient: services.scopedClusterClient.asCurrentUser,
      threatFilters: [...threatFilters, threatFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      ruleExecutionLogger,
      threatListConfig: {
        _source: [`${threatIndicatorPath}.*`, 'threat.feed.*', ...threatMatchedFields.threat],
        fields: undefined,
      },
      pitId: threatPitId,
      reassignPitId: reassignThreatPitId,
      runtimeMappings,
      listClient,
      exceptionFilter,
    });

    const signalMatches = getSignalMatchesFromThreatList(threatListHits, signalValueMap);

    const ids = signalMatches.map((item) => item.signalId);

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

    ruleExecutionLogger.debug(
      `${ids?.length} matched signals found from ${threatListHits.length} indicators`
    );

    const threatEnrichment = (signals: SignalSourceHit[]): Promise<SignalSourceHit[]> =>
      enrichSignalThreatMatches(
        signals,
        () => Promise.resolve(threatListHits),
        threatIndicatorPath,
        signalMatches
      );

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
