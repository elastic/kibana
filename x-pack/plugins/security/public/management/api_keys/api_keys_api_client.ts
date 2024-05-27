/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryContainer } from '@elastic/eui/src/components/search_bar/query/ast_to_es_query_dsl';

import type { HttpStart } from '@kbn/core/public';
import type { CreateAPIKeyParams, CreateAPIKeyResult } from '@kbn/security-plugin-types-server';

import type { QueryFilters } from './api_keys_grid/api_keys_table';
import type { ApiKeyToInvalidate, QueryApiKeyResult } from '../../../common/model';
import type { UpdateAPIKeyParams, UpdateAPIKeyResult } from '../../../server/routes/api_keys';

export type { CreateAPIKeyParams, CreateAPIKeyResult, UpdateAPIKeyParams, UpdateAPIKeyResult };

export interface InvalidateApiKeysResponse {
  itemsInvalidated: ApiKeyToInvalidate[];
  errors: any[];
}

export interface QueryApiKeySortOptions {
  field:
    | 'id'
    | 'type'
    | 'name'
    | 'username'
    | 'realm'
    | 'creation'
    | 'metadata'
    | 'role_descriptors'
    | 'expiration'
    | 'invalidated'
    | 'limited_by'
    | '_sort'
    | 'expired';
  direction: 'asc' | 'desc';
}

export interface QueryApiKeyParams {
  query: QueryContainer;
  from: number;
  size: number;
  sort: QueryApiKeySortOptions;
  filters: QueryFilters;
}

const apiKeysUrl = '/internal/security/api_key';

export class APIKeysAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async queryApiKeys(params?: QueryApiKeyParams) {
    return await this.http.post<QueryApiKeyResult>(`${apiKeysUrl}/_query`, {
      body: JSON.stringify(params || {}),
    });
  }

  public async invalidateApiKeys(apiKeys: ApiKeyToInvalidate[], isAdmin = false) {
    return await this.http.post<InvalidateApiKeysResponse>(`${apiKeysUrl}/invalidate`, {
      body: JSON.stringify({ apiKeys, isAdmin }),
    });
  }

  public async createApiKey(apiKey: CreateAPIKeyParams) {
    return await this.http.post<CreateAPIKeyResult>(apiKeysUrl, {
      body: JSON.stringify(apiKey),
    });
  }

  public async updateApiKey(apiKey: UpdateAPIKeyParams) {
    return await this.http.put<UpdateAPIKeyResult>(apiKeysUrl, {
      body: JSON.stringify(apiKey),
    });
  }
}
