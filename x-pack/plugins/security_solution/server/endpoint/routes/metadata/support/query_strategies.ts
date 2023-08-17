/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchResponse,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { HostMetadata } from '../../../../../common/endpoint/types';
import type { HostListQueryResult, HostQueryResult } from '../../../types';

/**
 * Maps the data from the index to `HostMetadata`, ensuring that only known properties are
 * returned.
 * @param data
 */
export function mapToHostMetadata(
  data:
    | HostMetadata
    // support for top-level 'HostDetails' property if found - from previous index schemas
    | { HostDetails: HostMetadata }
): HostMetadata {
  const {
    host,
    agent,
    '@timestamp': timestamp,
    elastic,
    Endpoint,
    event,
    data_stream: dataStream,
  } = 'HostDetails' in data ? data.HostDetails : data;

  return {
    '@timestamp': timestamp,
    event,
    elastic,
    Endpoint,
    agent,
    host,
    data_stream: dataStream,
  };
}

export const queryResponseToHostResult = (
  searchResponse: SearchResponse<HostMetadata | { HostDetails: HostMetadata }>
): HostQueryResult => {
  const response = searchResponse as SearchResponse<HostMetadata | { HostDetails: HostMetadata }>;
  const metadata =
    response.hits.hits && response.hits.hits[0] && response.hits.hits[0]._source
      ? mapToHostMetadata(response.hits.hits[0]._source)
      : undefined;

  const hostResult: HostQueryResult = {
    resultLength: response.hits.hits.length,
    result: metadata,
  };

  return hostResult;
};

export const queryResponseToHostListResult = (
  searchResponse: SearchResponse<HostMetadata | { HostDetails: HostMetadata }>
): HostListQueryResult => {
  const response = searchResponse as SearchResponse<HostMetadata | { HostDetails: HostMetadata }>;
  const list =
    response.hits.hits.length > 0
      ? response.hits.hits.map((entry) => mapToHostMetadata(entry?._source as HostMetadata))
      : [];

  return {
    resultLength: (response.hits?.total as SearchTotalHits).value || 0,
    resultList: list,
  };
};
