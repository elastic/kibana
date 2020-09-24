/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { getThreatList } from './get_threat_list';
import { buildThreatMappingFilter } from './build_threat_mapping_filter';

import { getFilter } from '../get_filter';
import { searchAfterAndBulkCreate } from '../search_after_bulk_create';
import { CreateThreatSignalOptions, ThreatListItem } from './types';
import { combineResults } from './utils';
import { SearchAfterAndBulkCreateReturnType } from '../types';

export const createThreatSignal = async ({
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
  buildRuleMessage,
  threatIndex,
  name,
  currentThreatList,
  currentResult,
}: CreateThreatSignalOptions): Promise<{
  threatList: SearchResponse<ThreatListItem>;
  results: SearchAfterAndBulkCreateReturnType;
}> => {
  const threatFilter = buildThreatMappingFilter({
    threatMapping,
    threatList: currentThreatList,
  });

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

  const newResult = await searchAfterAndBulkCreate({
    gap,
    previousStartedAt,
    listClient,
    exceptionsList: exceptionItems,
    ruleParams: params,
    services,
    logger,
    id: alertId,
    inputIndexPattern: inputIndex,
    signalsIndex: outputIndex,
    filter: esFilter,
    actions,
    name,
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    interval,
    enabled,
    pageSize: searchAfterSize,
    refresh,
    tags,
    throttle,
    buildRuleMessage,
  });

  const results = combineResults(currentResult, newResult);
  const searchAfter = currentThreatList.hits.hits[currentThreatList.hits.hits.length - 1].sort;

  const threatList = await getThreatList({
    callCluster: services.callCluster,
    exceptionItems,
    query: threatQuery,
    threatFilters,
    index: [threatIndex],
    searchAfter,
    sortField: undefined,
    sortOrder: undefined,
  });

  return { threatList, results };
};
