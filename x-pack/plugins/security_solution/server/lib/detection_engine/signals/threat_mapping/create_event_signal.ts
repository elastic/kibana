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
import { CreateEventSignalOptions } from './types';
import { SearchAfterAndBulkCreateReturnType, SignalSearchResponse } from '../types';
import { getAllThreatListHits } from './get_threat_list';
import {
  enrichSignalThreatMatches,
  getSignalMatchesFromThreatList,
} from './enrich_signal_threat_matches';

export const createEventSignal = async ({
  alertId,
  buildRuleMessage,
  bulkCreate,
  completeRule,
  currentResult,
  currentEventList,
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
}: CreateEventSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentEventList,
    entryKey: 'field',
  });

  if (!threatFilter.query || threatFilter.query?.bool.should.length === 0) {
    // empty event list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    logger.debug(
      buildRuleMessage(
        'Indicator items are empty after filtering for missing data, returning without attempting a match'
      )
    );
    return currentResult;
  } else {
    const threatListHits = await getAllThreatListHits({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      threatFilters: [...threatFilters, threatFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      logger,
      buildRuleMessage,
      threatListConfig: {
        _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
        fields: undefined,
      },
      pitId: threatPitId,
      reassignPitId: reassignThreatPitId,
    });

    const signalMatches = getSignalMatchesFromThreatList(threatListHits);

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
      lists: exceptionItems,
    });

    logger.debug(
      buildRuleMessage(
        `${ids?.length} matched signals found from ${threatListHits.length} indicators`
      )
    );

    const threatEnrichment = (signals: SignalSearchResponse): Promise<SignalSearchResponse> =>
      enrichSignalThreatMatches(
        signals,
        () => Promise.resolve(threatListHits),
        threatIndicatorPath,
        signalMatches
      );

    const result = await searchAfterAndBulkCreate({
      buildReasonMessage: buildReasonMessageForThreatMatchAlert,
      buildRuleMessage,
      bulkCreate,
      completeRule,
      enrichment: threatEnrichment,
      eventsTelemetry,
      exceptionsList: exceptionItems,
      filter: esFilter,
      id: alertId,
      inputIndexPattern: inputIndex,
      listClient,
      logger,
      pageSize: searchAfterSize,
      services,
      signalsIndex: outputIndex,
      sortOrder: 'desc',
      trackTotalHits: false,
      tuple,
      wrapHits,
    });

    logger.debug(
      buildRuleMessage(
        `${
          threatFilter.query?.bool.should.length
        } items have completed match checks and the total times to search were ${
          result.searchAfterTimes.length !== 0 ? result.searchAfterTimes : '(unknown) '
        }ms`
      )
    );
    return result;
  }
};
