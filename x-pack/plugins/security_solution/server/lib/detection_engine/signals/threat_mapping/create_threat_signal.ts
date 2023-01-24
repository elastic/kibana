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
import type { CreateThreatSignalOptions } from './types';
import type { SearchAfterAndBulkCreateReturnType } from '../types';

export const createThreatSignal = async ({
  alertId,
  bulkCreate,
  completeRule,
  currentResult,
  currentThreatList,
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
  threatEnrichment,
  threatMapping,
  tuple,
  type,
  wrapHits,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
}: CreateThreatSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentThreatList,
    entryKey: 'value',
  });

  if (!threatFilter.query || threatFilter.query?.bool.should.length === 0) {
    // empty threat list and we do not want to return everything as being
    // a hit so opt to return the existing result.
    ruleExecutionLogger.debug(
      'Indicator items are empty after filtering for missing data, returning without attempting a match'
    );
    return currentResult;
  } else {
    const esFilter = await getFilter({
      type,
      filters: [...filters, threatFilter],
      language,
      query,
      savedId,
      services,
      index: inputIndex,
      exceptionFilter,
    });

    ruleExecutionLogger.debug(
      `${threatFilter.query?.bool.should.length} indicator items are being checked for existence of matches`
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
