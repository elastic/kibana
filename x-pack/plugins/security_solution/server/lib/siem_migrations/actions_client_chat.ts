/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionsClientBedrockChatModel,
  ActionsClientChatOpenAI,
  ActionsClientGeminiChatModel,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server';
import type { Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ActionsClientChatOpenAIParams } from '@kbn/langchain/server/language_models/chat_openai';
import type { CustomChatModelInput as ActionsClientBedrockChatModelParams } from '@kbn/langchain/server/language_models/bedrock_chat';
import type { CustomChatModelInput as ActionsClientGeminiChatModelParams } from '@kbn/langchain/server/language_models/gemini_chat';
import type { CustomChatModelInput as ActionsClientSimpleChatModelParams } from '@kbn/langchain/server/language_models/simple_chat_model';

export type ChatModel =
  | ActionsClientSimpleChatModel
  | ActionsClientChatOpenAI
  | ActionsClientBedrockChatModel
  | ActionsClientGeminiChatModel;

export type ActionsClientChatModelClass =
  | typeof ActionsClientSimpleChatModel
  | typeof ActionsClientChatOpenAI
  | typeof ActionsClientBedrockChatModel
  | typeof ActionsClientGeminiChatModel;

export type ChatModelParams = Partial<ActionsClientSimpleChatModelParams> &
  Partial<ActionsClientChatOpenAIParams> &
  Partial<ActionsClientBedrockChatModelParams> &
  Partial<ActionsClientGeminiChatModelParams> & {
    /** Enables the streaming mode of the response, disabled by default */
    streaming?: boolean;
  };

export class ActionsClientChat {
  constructor(
    private readonly connectorId: string,
    private readonly actionsClient: ActionsClient,
    private readonly logger: Logger
  ) {}

  public async createModel(params?: ChatModelParams): Promise<ChatModel> {
    const connector = await this.actionsClient.get({ id: this.connectorId });
    if (!connector) {
      throw new Error(`Connector not found: ${this.connectorId}`);
    }

    const llmType = this.getLLMType(connector.actionTypeId);
    const ChatModelClass = this.getLLMClass(llmType);

    const model = new ChatModelClass({
      actionsClient: this.actionsClient,
      connectorId: this.connectorId,
      logger: this.logger,
      llmType,
      model: connector.config?.defaultModel,
      ...params,
      streaming: params?.streaming ?? false, // disabling streaming by default, for some reason is enabled when omitted
    });
    return model;
  }

  private getLLMType(actionTypeId: string): string | undefined {
    const llmTypeDictionary: Record<string, string> = {
      [`.gen-ai`]: `openai`,
      [`.bedrock`]: `bedrock`,
      [`.gemini`]: `gemini`,
    };
    return llmTypeDictionary[actionTypeId];
  }

  private getLLMClass(llmType?: string): ActionsClientChatModelClass {
    return llmType === 'openai'
      ? ActionsClientChatOpenAI
      : llmType === 'bedrock'
      ? ActionsClientBedrockChatModel
      : llmType === 'gemini'
      ? ActionsClientGeminiChatModel
      : ActionsClientSimpleChatModel;
  }
}
