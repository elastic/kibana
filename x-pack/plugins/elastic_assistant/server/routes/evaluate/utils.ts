/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import type { ActionResult } from '@kbn/actions-plugin/server';

/**
 * Returns the LangChain `llmType` for the given connectorId/connectors
 *
 * @param connectorId
 * @param connectors
 */
export const getLlmType = (connectorId: string, connectors: ActionResult[]): string | undefined => {
  const connector = connectors.find((c) => c.id === connectorId);
  // Note: Pre-configured connectors do not have an accessible `apiProvider` field
  const apiProvider = (connector?.config?.apiProvider as string) ?? undefined;

  if (apiProvider === OpenAiProviderType.OpenAi) {
    // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/agents/openai/index.ts#L185
    return 'openai';
  }
  // TODO: Add support for AWS Bedrock Connector once merged
  // Note: Doesn't appear to be a difference between Azure and OpenAI LLM types, so TBD for functions agent on Azure
  // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/llms/openai.ts#L539

  return undefined;
};
