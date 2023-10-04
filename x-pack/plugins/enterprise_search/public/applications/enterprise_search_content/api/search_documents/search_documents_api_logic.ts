/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';

import { Meta } from '../../../../../common/types';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface SearchDocumentsApiLogicArgs {
  docsPerPage?: number;
  indexName: string;
  pagination: { pageIndex: number; pageSize: number };
  query?: string;
}

export interface SearchDocumentsApiLogicValues {
  meta: Meta;
  results: SearchResponseBody;
}

export type SearchDocumentsApiLogicActions = Actions<
  SearchDocumentsApiLogicArgs,
  SearchDocumentsApiLogicValues
>;

export const searchDocuments = async ({
  docsPerPage,
  indexName,
  pagination,
  query: searchQuery,
}: SearchDocumentsApiLogicArgs) => {
  const newIndexName = encodeURIComponent(indexName);
  const route = `/internal/enterprise_search/indices/${newIndexName}/search`;
  const query = {
    page: pagination.pageIndex,
    size: docsPerPage || pagination.pageSize,
  };

  return await HttpLogic.values.http.post<SearchDocumentsApiLogicValues>(route, {
    body: JSON.stringify({
      searchQuery,
    }),
    query,
  });
};

export const searchDocumentsApiLogic = (indexName: string) =>
  createApiLogic(['search_documents_api_logic', indexName], searchDocuments);
