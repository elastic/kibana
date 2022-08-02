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
  indexName,
  meta,
  query: q,
}: {
  indexName: string;
  meta: Meta;
  query: string;
}) => {
  const route = `/internal/enterprise_search/indices/${indexName}/search/${q}`;
  const query = {
    page: meta.page.current,
    size: meta.page.size,
  };

  return await HttpLogic.values.http.get<{ meta: Meta; results: SearchResponseBody }>(route, {
    query,
  });
};

export const SearchDocumentsApiLogic = createApiLogic(
  ['search_documents_api_logic'],
  searchDocuments
);
