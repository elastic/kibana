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
import { SearchAfterAndBulkCreateReturnType } from '../types';
import { getThreatList } from './get_threat_list';
import { extractNamedQueries } from './utils';
import {
  groupAndMergeSignalMatches,
  enrichSignalThreatMatches,
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
  threatEnrichment,
  threatMapping,
  tuple,
  type,
  wrapHits,
  threatQuery,
  threatFilters,
  threatLanguage,
  threatIndex,
  threatListConfig,
  threatIndicatorPath,
}: CreateEventSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentEventList,
    entryKey: 'field',
  });

  if (!threatFilter.query || threatFilter.query?.bool.should.length === 0) {
    // empty threat list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    logger.debug(
      buildRuleMessage(
        'Indicator items are empty after filtering for missing data, returning without attempting a match'
      )
    );
    return currentResult;
  } else {
    // should we get all threat list? or only per page?
    const threatList = await getThreatList({
      esClient: services.scopedClusterClient.asCurrentUser,
      exceptionItems,
      threatFilters: [...threatFilters, threatFilter],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      searchAfter: undefined,
      logger,
      buildRuleMessage,
      threatListConfig,
    });

    const uniqueHits = groupAndMergeSignalMatches(threatList.hits.hits);
    const threatMatches = uniqueHits.map((threatHit) =>
      extractNamedQueries(threatHit).map((item) => {
        const newField = item.value;
        const newValue = item.field;
        return {
          ...item,
          field: newField,
          value: newValue,
          signalId: item.id,
          id: threatHit._id,
        };
      })
    );
    const signalMap = {};

    threatMatches.forEach((queries) =>
      queries.forEach((query) => {
        if (signalMap[query.signalId]) {
          signalMap[query.signalId].push(query);
        } else {
          signalMap[query.signalId] = [query];
        }
      })
    );

    const signalMatches = Object.entries(signalMap).map(([key, value]) => ({
      signalId: key,
      queries: value,
    }));

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

    logger.debug(buildRuleMessage(`${JSON.stringify(threatMatches)}`));

    logger.debug(
      buildRuleMessage(
        `${threatFilter.query?.bool.should.length} indicator items are being checked for existence of matches`
      )
    );

    const result = await searchAfterAndBulkCreate({
      buildReasonMessage: buildReasonMessageForThreatMatchAlert,
      buildRuleMessage,
      bulkCreate,
      completeRule,
      enrichment: (signals) =>
        enrichSignalThreatMatches(
          signals,
          () => threatList.hits.hits,
          threatIndicatorPath,
          signalMatches
        ),
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
