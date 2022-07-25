/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export const searchDocuments = async ({
  indexName,
  query,
}: {
  indexName: string;
  query: string;
}) => {
  const route = `/internal/enterprise_search/indices/${indexName}/search/${query}`;

  return await HttpLogic.values.http.get<SearchResponseBody>(route);
};

export const SearchDocumentsApiLogic = createApiLogic(
  ['search_documents_api_logic'],
  searchDocuments
);
