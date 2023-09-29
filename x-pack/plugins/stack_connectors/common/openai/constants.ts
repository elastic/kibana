/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OPENAI_TITLE = i18n.translate(
  'xpack.stackConnectors.components.genAi.connectorTypeTitle',
  {
    defaultMessage: 'OpenAI',
  }
);
export const OPENAI_CONNECTOR_ID = '.gen-ai';
export enum SUB_ACTION {
  RUN = 'run',
  INVOKE_AI = 'invokeAI',
  STREAM = 'stream',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
}

export enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
}

export const DEFAULT_OPENAI_MODEL = 'gpt-4';

export const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions' as const;
export const OPENAI_LEGACY_COMPLETION_URL = 'https://api.openai.com/v1/completions' as const;
export const AZURE_OPENAI_CHAT_URL =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}' as const;
export const AZURE_OPENAI_COMPLETIONS_URL =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/completions?api-version={api-version}' as const;
export const AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/extensions/chat/completions?api-version={api-version}' as const;
