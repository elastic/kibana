/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawRule } from '../../types';
import { CreateAPIKeyResult } from '../types';

export function apiKeyAsAlertAttributes(
  apiKey: CreateAPIKeyResult | null,
  username: string | null,
  createdByUser: boolean
): Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser'> {
  return apiKey && apiKey.apiKeysEnabled
    ? {
        apiKeyOwner: username,
        apiKey: Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64'),
        apiKeyCreatedByUser: createdByUser,
      }
    : {
        apiKeyOwner: null,
        apiKey: null,
        apiKeyCreatedByUser: null,
      };
}
