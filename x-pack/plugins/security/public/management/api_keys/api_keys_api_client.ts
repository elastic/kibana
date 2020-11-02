/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'src/core/public';
import { ApiKey, ApiKeyToInvalidate, Role } from '../../../common/model';

export interface CheckPrivilegesResponse {
  areApiKeysEnabled: boolean;
  isAdmin: boolean;
  canManage: boolean;
}

export interface InvalidateApiKeysResponse {
  itemsInvalidated: ApiKeyToInvalidate[];
  errors: any[];
}

export interface GetApiKeysResponse {
  apiKeys: ApiKey[];
}

export interface CreateApiKeyRequest {
  name: string;
  expiration?: string;
  role_descriptors?: {
    [key in string]: Role['elasticsearch'];
  };
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  expiration: number;
  api_key: string;
}

const apiKeysUrl = '/internal/security/api_key';

export class APIKeysAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async checkPrivileges() {
    return await this.http.get<CheckPrivilegesResponse>(`${apiKeysUrl}/privileges`);
  }

  public async getApiKeys(isAdmin = false) {
    return await this.http.get<GetApiKeysResponse>(apiKeysUrl, { query: { isAdmin } });
  }

  public async invalidateApiKeys(apiKeys: ApiKeyToInvalidate[], isAdmin = false) {
    return await this.http.post<InvalidateApiKeysResponse>(`${apiKeysUrl}/invalidate`, {
      body: JSON.stringify({ apiKeys, isAdmin }),
    });
  }

  public async createApiKey(apiKey: CreateApiKeyRequest) {
    return await this.http.post<CreateApiKeyResponse>(apiKeysUrl, {
      body: JSON.stringify(apiKey),
    });
  }
}
