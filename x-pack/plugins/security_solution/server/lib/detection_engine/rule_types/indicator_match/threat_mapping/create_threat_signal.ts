/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getFilter } from '../../utils/get_filter';
import { searchAfterAndBulkCreate } from '../../utils/search_after_bulk_create';
import { buildReasonMessageForThreatMatchAlert } from '../../utils/reason_formatters';
import type { CreateThreatSignalOptions } from './types';
import type { SearchAfterAndBulkCreateReturnType } from '../../types';
import { searchAfterAndBulkCreateSuppressedAlerts } from '../../utils/search_after_bulk_create_suppressed_alerts';

import { buildThreatEnrichment } from './build_threat_enrichment';
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
  threatMapping,
  tuple,
  type,
  wrapHits,
  wrapSuppressedHits,
  runtimeMappings,
  runOpts,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  unprocessedExceptions,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatPitId,
  threatQuery,
  reassignThreatPitId,
  allowedFieldsForTermsQuery,
  inputIndexFields,
  threatIndexFields,
  sortOrder = 'desc',
  isAlertSuppressionActive,
  experimentalFeatures,
}: CreateThreatSignalOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentThreatList,
    entryKey: 'value',
    allowedFieldsForTermsQuery,
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
      fields: inputIndexFields,
      loadFields: true,
    });

    ruleExecutionLogger.debug(
      `${threatFilter.query?.bool.should.length} indicator items are being checked for existence of matches`
    );

    const threatEnrichment = buildThreatEnrichment({
      ruleExecutionLogger,
      services,
      threatFilters,
      threatIndex,
      threatIndicatorPath,
      threatLanguage,
      threatQuery,
      pitId: threatPitId,
      reassignPitId: reassignThreatPitId,
      listClient,
      exceptionFilter,
      threatMapping,
      runtimeMappings,
      threatIndexFields,
    });

    let result: SearchAfterAndBulkCreateReturnType;
    const searchAfterBulkCreateParams = {
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
      sortOrder,
      trackTotalHits: false,
      tuple,
      wrapHits,
      runtimeMappings,
      primaryTimestamp,
      secondaryTimestamp,
    };

    if (isAlertSuppressionActive) {
      result = await searchAfterAndBulkCreateSuppressedAlerts({
        ...searchAfterBulkCreateParams,
        wrapSuppressedHits,
        alertTimestampOverride: runOpts.alertTimestampOverride,
        alertWithSuppression: runOpts.alertWithSuppression,
        alertSuppression: completeRule.ruleParams.alertSuppression,
        experimentalFeatures,
      });
    } else {
      result = await searchAfterAndBulkCreate(searchAfterBulkCreateParams);
    }

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
