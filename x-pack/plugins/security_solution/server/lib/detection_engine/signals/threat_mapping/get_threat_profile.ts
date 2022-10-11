/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateThreatSignalsOptions,
  EventCountOptions,
  ThreatListCountOptions,
} from './types';
import { getMappingFilters } from './get_mapping_filters';
import { getQueryFilter } from '../get_query_filter';
import { buildEventsSearchQuery } from '../build_events_query';

export const getEventProfile = async ({
  esClient,
  query,
  language,
  filters,
  index,
  tuple,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
}: EventCountOptions) => {
  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters,
    index,
    exceptionFilter,
  });
  const eventSearchQueryBodyQuery = buildEventsSearchQuery({
    index,
    from: tuple.from.toISOString(),
    to: tuple.to.toISOString(),
    filter: queryFilter,
    size: 0,
    primaryTimestamp,
    secondaryTimestamp,
    searchAfterSortIds: undefined,
    runtimeMappings: undefined,
  }).body.query;
  const response = await esClient.search({
    body: { query: eventSearchQueryBodyQuery, profile: true },
    ignore_unavailable: true,
    index,
  });
  return response;
};

export const getThreatListProfile = async ({
  esClient,
  query,
  language,
  threatFilters,
  index,
  exceptionFilter,
}: ThreatListCountOptions) => {
  const queryFilter = getQueryFilter({
    query,
    language: language ?? 'kuery',
    filters: threatFilters,
    index,
    exceptionFilter,
  });
  const response = await esClient.search({
    body: {
      query: queryFilter,
      profile: true,
    },
    ignore_unavailable: true,
    index,
  });
  return response;
};

export const getThreatProfile = async ({
  filters,
  inputIndex,
  language,
  query,
  services,
  threatFilters,
  threatIndex,
  threatLanguage,
  threatMapping,
  threatQuery,
  tuple,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
}: CreateThreatSignalsOptions) => {
  const { eventMappingFilter, indicatorMappingFilter } = getMappingFilters(threatMapping);
  const allEventFilters = [...filters, eventMappingFilter];
  const allThreatFilters = [...threatFilters, indicatorMappingFilter];

  const eventProfile = await getEventProfile({
    esClient: services.scopedClusterClient.asCurrentUser,
    index: inputIndex,
    tuple,
    query,
    language,
    filters: allEventFilters,
    primaryTimestamp,
    secondaryTimestamp,
    exceptionFilter,
  });

  const threatListProfile = await getThreatListProfile({
    esClient: services.scopedClusterClient.asCurrentUser,
    threatFilters: allThreatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    exceptionFilter,
  });
  console.log('-------eventProfile-------', JSON.stringify(eventProfile));
  return {
    eventProfile,
    threatListProfile,
  };
};
