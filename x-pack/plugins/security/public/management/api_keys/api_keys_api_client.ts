/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'src/core/public';
import { ApiKey, ApiKeyToInvalidate } from '../../../common/model';

interface CheckPrivilegesResponse {
  areApiKeysEnabled: boolean;
  isAdmin: boolean;
  canManage: boolean;
}

interface InvalidateApiKeysResponse {
  itemsInvalidated: ApiKeyToInvalidate[];
  errors: any[];
}

interface GetApiKeysResponse {
  apiKeys: ApiKey[];
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
}
