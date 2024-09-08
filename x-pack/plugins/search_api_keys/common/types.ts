/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Id, long, Name } from '@elastic/elasticsearch/lib/api/types';

export enum APIRoutes {
  API_KEYS = '/internal/search_api_keys',
}

export interface APIKeyCreationResponse {
  api_key: string;
  encoded: string;
  name: string;
  expiration?: number;
}

export interface GetApiKeyResponse {
  creation?: long;
  expiration?: long;
  id: Id;
  invalidated?: boolean;
  name: Name;
}
