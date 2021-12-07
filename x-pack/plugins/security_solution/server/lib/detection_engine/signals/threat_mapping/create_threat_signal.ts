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
  alertId,
  buildRuleMessage,
  bulkCreate,
  completeRule,
  currentResult,
  currentThreatList,
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
