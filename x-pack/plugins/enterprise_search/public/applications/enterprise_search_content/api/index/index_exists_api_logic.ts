/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface IndexExistsApiParams {
  indexName: string;
}

export interface IndexExistsApiResponse {
  exists: boolean;
  indexName: string;
}

export const fetchIndexExists = async ({
  indexName,
}: IndexExistsApiParams): Promise<IndexExistsApiResponse> => {
  const route = `/internal/enterprise_search/indices/${indexName}/exists`;

  const { exists } = await HttpLogic.values.http.get<{ exists: boolean }>(route);
  return { exists, indexName };
};

export const IndexExistsApiLogic = createApiLogic(['index_exists_api_logic'], fetchIndexExists);
