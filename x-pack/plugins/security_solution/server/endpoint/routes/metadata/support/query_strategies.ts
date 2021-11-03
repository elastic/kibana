/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { HostMetadata } from '../../../../../common/endpoint/types';
import { HostListQueryResult, HostQueryResult } from '../../../types';

// remove the top-level 'HostDetails' property if found, from previous schemas
function stripHostDetails(host: HostMetadata | { HostDetails: HostMetadata }): HostMetadata {
  return 'HostDetails' in host ? host.HostDetails : host;
}

export const queryResponseToHostResult = (
  searchResponse: SearchResponse<HostMetadata | { HostDetails: HostMetadata }>
): HostQueryResult => {
  const response = searchResponse as SearchResponse<HostMetadata | { HostDetails: HostMetadata }>;
  return {
    resultLength: response.hits.hits.length,
    result:
      response.hits.hits.length > 0
        ? stripHostDetails(response.hits.hits[0]._source as HostMetadata)
        : undefined,
  };
};

export const queryResponseToHostListResult = (
  searchResponse: SearchResponse<HostMetadata | { HostDetails: HostMetadata }>
): HostListQueryResult => {
  const response = searchResponse as SearchResponse<HostMetadata | { HostDetails: HostMetadata }>;
  const list =
    response.hits.hits.length > 0
      ? response.hits.hits.map((entry) => stripHostDetails(entry?._source as HostMetadata))
      : [];

  return {
    resultLength:
      (response.hits?.total as unknown as { value: number; relation: string }).value || 0,
    resultList: list,
  };
};
