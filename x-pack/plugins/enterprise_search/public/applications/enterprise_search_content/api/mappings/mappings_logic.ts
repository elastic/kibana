/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface GetMappingsArgs {
  indexName: string;
}

export type GetMappingsResponse = IndicesGetMappingIndexMappingRecord;

export const getMappings = async ({ indexName }: GetMappingsArgs) => {
  const route = `/internal/enterprise_search/mappings/${indexName}`;

  return await HttpLogic.values.http.get<IndicesGetMappingIndexMappingRecord>(route);
};

export const MappingsApiLogic = createApiLogic(['mappings_api_logic'], getMappings);
