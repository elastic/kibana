/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getThreatList } from './get_threat_list';

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
  let results: SearchAfterAndBulkCreateReturnType = {
    success: true,
    bulkCreateTimes: [],
    searchAfterTimes: [],
    lastLookBackDate: null,
    createdSignalsCount: 0,
    errors: [],
  };

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
  });

  while (threatList.hits.hits.length !== 0 && results.createdSignalsCount <= params.maxSignals) {
    ({ threatList, results } = await createThreatSignal({
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
      threatFilters,
      threatQuery,
      buildRuleMessage,
      threatIndex,
      threatLanguage,
      name,
      currentThreatList: threatList,
      currentResult: results,
    }));
  }
  return results;
};
