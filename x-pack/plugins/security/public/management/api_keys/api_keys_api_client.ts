/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { CreateAPIKeyParams, CreateAPIKeyResult } from '@kbn/security-plugin-types-server';

import type { ApiKeyToInvalidate } from '../../../common/model';
import type {
  GetAPIKeysResult,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
} from '../../../server/routes/api_keys';

export type { CreateAPIKeyParams, CreateAPIKeyResult, UpdateAPIKeyParams, UpdateAPIKeyResult };

export interface InvalidateApiKeysResponse {
  itemsInvalidated: ApiKeyToInvalidate[];
  errors: any[];
}

const apiKeysUrl = '/internal/security/api_key';

export class APIKeysAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async getApiKeys() {
    return await this.http.get<GetAPIKeysResult>(apiKeysUrl);
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
