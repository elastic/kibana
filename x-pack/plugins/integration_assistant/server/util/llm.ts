/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientChatOpenAI,
  ActionsClientBedrockChatModel,
  ActionsClientSimpleChatModel,
  ActionsClientGeminiChatModel,
} from '@kbn/langchain/server';
export const getLlmType = (actionTypeId: string): string | undefined => {
  const llmTypeDictionary: Record<string, string> = {
    [`.gen-ai`]: `openai`,
    [`.bedrock`]: `bedrock`,
    [`.gemini`]: `gemini`,
  };
  return llmTypeDictionary[actionTypeId];
};

export const getLlmClass = (llmType?: string) =>
  llmType === 'openai'
    ? ActionsClientChatOpenAI
    : llmType === 'bedrock'
    ? ActionsClientBedrockChatModel
    : llmType === 'gemini'
    ? ActionsClientGeminiChatModel
    : ActionsClientSimpleChatModel;
