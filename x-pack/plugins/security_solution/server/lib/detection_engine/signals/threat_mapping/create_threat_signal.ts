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
import { CreateThreatSignalOptions } from './types';
import { SearchAfterAndBulkCreateReturnType } from '../types';

export const createThreatSignal = async ({
  tuple,
  threatMapping,
  threatEnrichment,
  query,
  inputIndex,
  type,
  filters,
  language,
  savedId,
  services,
  exceptionItems,
  listClient,
  logger,
  eventsTelemetry,
  alertId,
  outputIndex,
  ruleSO,
  searchAfterSize,
  buildRuleMessage,
  currentThreatList,
  currentResult,
  bulkCreate,
  wrapHits,
}: CreateThreatSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentThreatList,
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
    const esFilter = await getFilter({
      type,
      filters: [...filters, threatFilter],
      language,
      query,
      savedId,
      services,
      index: inputIndex,
      lists: exceptionItems,
    });

    logger.debug(
      buildRuleMessage(
        `${threatFilter.query?.bool.should.length} indicator items are being checked for existence of matches`
      )
    );

    const result = await searchAfterAndBulkCreate({
      tuple,
      listClient,
      exceptionsList: exceptionItems,
      ruleSO,
      services,
      logger,
      eventsTelemetry,
      id: alertId,
      inputIndexPattern: inputIndex,
      signalsIndex: outputIndex,
      filter: esFilter,
      pageSize: searchAfterSize,
      buildRuleMessage,
      buildReasonMessage: buildReasonMessageForThreatMatchAlert,
      enrichment: threatEnrichment,
      bulkCreate,
      wrapHits,
      sortOrder: 'desc',
      trackTotalHits: false,
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
