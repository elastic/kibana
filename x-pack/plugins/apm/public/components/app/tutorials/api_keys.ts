/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface AgentApiKey {
  apiKey: string;
  id?: string;
  encodedKey?: string;
  error: boolean;
  errorMessage?: string;
}

export const API_KEY_INSTRUCTION = i18n.translate(
  'xpack.apm.tutorials.apiKey.generate',
  {
    defaultMessage: '<Generate an API Key>',
  }
);

export function isApiKeyGenerated(key: string) {
  return key !== API_KEY_INSTRUCTION;
}
