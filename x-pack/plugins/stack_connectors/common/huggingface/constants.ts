/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const HUGGINGFACE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.genAi.connectorTypeTitle',
  {
    defaultMessage: 'HuggingFace',
  }
);
export const HUGGINGFACE_CONNECTOR_ID = '.hugging_face';
export enum SUB_ACTION {
  RUN = 'run',
  INVOKE_AI = 'invokeAI',
  INVOKE_STREAM = 'invokeStream',
  INVOKE_ASYNC_ITERATOR = 'invokeAsyncIterator',
  STREAM = 'stream',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
}

export enum HuggingFaceProviderType {
  HuggingFace = 'HuggingFace',
}

export const DEFAULT_TIMEOUT_MS = 120000;

export const DEFAULT_HUGGINGFACE_MODEL = 'gpt-4';

// Have to change apis to ones given by the backend team
export const HUGGINGFACE_CHAT_URL = 'https://api.openai.com/v1/chat/completions' as const;
export const HUGGINGFACE_LEGACY_COMPLETION_URL = 'https://api.openai.com/v1/completions' as const;
export const AZURE_OPENAI_CHAT_URL =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}' as const;
export const AZURE_OPENAI_COMPLETIONS_URL =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/completions?api-version={api-version}' as const;
export const AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL =
  'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/extensions/chat/completions?api-version={api-version}' as const;
