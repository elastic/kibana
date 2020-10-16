/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getThreatList, getThreatListCount } from './get_threat_list';

import { CreateThreatSignalsOptions } from './types';
import { createThreatSignal } from './create_threat_signal';
import { SearchAfterAndBulkCreateReturnType } from '../types';

export const createThreatSignals = async ({
  threatMapping,
  query,
  inputIndex,
  type,
  filters,
  language,
  savedId,
  services,
  exceptionItems,
  gap,
  previousStartedAt,
  listClient,
  logger,
  eventsTelemetry,
  alertId,
  outputIndex,
  params,
  searchAfterSize,
  actions,
  createdBy,
  createdAt,
  updatedBy,
  interval,
  updatedAt,
  enabled,
  refresh,
  tags,
  throttle,
  threatFilters,
  threatQuery,
  threatLanguage,
  buildRuleMessage,
  threatIndex,
  name,
}: CreateThreatSignalsOptions): Promise<SearchAfterAndBulkCreateReturnType> => {
  logger.debug(buildRuleMessage('Starting threat matching'));
  let results: SearchAfterAndBulkCreateReturnType = {
    success: true,
    bulkCreateTimes: [],
    searchAfterTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
    errors: [],
  };

  let threatListCount = await getThreatListCount({
    callCluster: services.callCluster,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
  });
  logger.debug(buildRuleMessage(`Total threat list items ${threatListCount}`));

  let threatList = await getThreatList({
    callCluster: services.callCluster,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    listClient,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
    logger,
    buildRuleMessage,
  });

  while (threatList.hits.hits.length !== 0 && results.createdSignalsCount <= params.maxSignals) {
    ({ results } = await createThreatSignal({
      threatMapping,
      query,
      inputIndex,
      type,
      filters,
      language,
      savedId,
      services,
      exceptionItems,
      gap,
      previousStartedAt,
      listClient,
      logger,
      eventsTelemetry,
      alertId,
      outputIndex,
      params,
      searchAfterSize,
      actions,
      createdBy,
      createdAt,
      updatedBy,
      updatedAt,
      interval,
      enabled,
      tags,
      refresh,
      throttle,
      buildRuleMessage,
      name,
      currentThreatList: threatList,
      currentResult: results,
    }));
    threatListCount -= threatList.hits.hits.length;
    logger.debug(
      buildRuleMessage(`Approximate number of threat list items to check are ${threatListCount}`)
    );

    threatList = await getThreatList({
      callCluster: services.callCluster,
      exceptionItems,
      query: threatQuery,
      language: threatLanguage,
      threatFilters,
      index: threatIndex,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
      sortField: undefined,
      sortOrder: undefined,
      listClient,
      buildRuleMessage,
      logger,
    });
  }
  logger.debug(buildRuleMessage('Done threat matching'));
  return results;
};
