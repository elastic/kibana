/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { IndexData } from '../../types';

export type { IndexData } from '../../types';

export const fetchIndex = async ({ indexName }: { indexName: string }) => {
  const route = `/internal/enterprise_search/indices/${indexName}`;

  return await HttpLogic.values.http.get<IndexData>(route);
};

export const FetchIndexApiLogic = createApiLogic(['fetch_index_api_logic'], fetchIndex);
