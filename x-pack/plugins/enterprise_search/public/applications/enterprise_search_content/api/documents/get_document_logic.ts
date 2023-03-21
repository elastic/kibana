/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetResponse } from '@elastic/elasticsearch/lib/api/types';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface GetDocumentsArgs {
  documentId: string;
  indexName: string;
}

export type GetDocumentsResponse = GetResponse<unknown>;

export const getDocument = async ({ indexName, documentId }: GetDocumentsArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/document/${documentId}`;

  return await HttpLogic.values.http.get<GetDocumentsResponse>(route);
};

export const GetDocumentsApiLogic = createApiLogic(['get_documents_logic'], getDocument);
