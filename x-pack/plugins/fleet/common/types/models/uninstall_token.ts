/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UninstallToken {
  id: string;
  policy_id: string;
  token: string;
  created_at: string;
}

export type UninstallTokenMetadata = Omit<UninstallToken, 'token'>;
