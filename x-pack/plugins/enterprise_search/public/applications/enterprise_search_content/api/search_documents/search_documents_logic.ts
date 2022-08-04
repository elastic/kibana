/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';

import { Meta } from '../../../../../common/types';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export const searchDocuments = async ({
  docsPerPage,
  indexName,
  pagination,
  query: q,
}: {
  docsPerPage?: number;
  indexName: string;
  pagination: { pageIndex: number; pageSize: number; totalItemCount: number };
  query: string;
}) => {
  const route = `/internal/enterprise_search/indices/${indexName}/search/${q}`;
  const query = {
    page: pagination.pageIndex,
    size: docsPerPage || pagination.pageSize,
  };

  return await HttpLogic.values.http.get<{ meta: Meta; results: SearchResponseBody }>(route, {
    query,
  });
};

export const SearchDocumentsApiLogic = createApiLogic(
  ['search_documents_api_logic'],
  searchDocuments
);
