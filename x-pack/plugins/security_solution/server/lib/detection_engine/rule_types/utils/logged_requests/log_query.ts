/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchSourceConfig,
  Indices,
  Fields,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface SearchRequest {
  query?: QueryDslQueryContainer;
  _source?: SearchSourceConfig;
  fields?: Fields;
}

interface LogQueryRequestParams {
  index: Indices;
  ignoreUnavailable?: boolean;
}

export const logQueryRequest = (
  searchRequest: SearchRequest,
  { index, ignoreUnavailable = false }: LogQueryRequestParams
): string => {
  return `POST /${index}/_search?ignore_unavailable=${ignoreUnavailable}\n${JSON.stringify(
    searchRequest,
    null,
    2
  )}`;
};
