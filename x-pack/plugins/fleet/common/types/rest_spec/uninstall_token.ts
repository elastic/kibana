/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UninstallToken, UninstallTokenMetadata } from '../models/uninstall_token';

import type { ListResult } from './common';

export interface GetUninstallTokensMetadataRequest {
  query: {
    policyId?: string;
    search?: string;
    perPage?: number;
    page?: number;
  };
}

export type GetUninstallTokensMetadataResponse = ListResult<UninstallTokenMetadata>;

export interface GetUninstallTokenRequest {
  params: {
    uninstallTokenId: string;
  };
}

export interface GetUninstallTokenResponse {
  item: UninstallToken;
}
