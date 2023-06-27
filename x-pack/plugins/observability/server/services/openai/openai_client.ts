/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompletionRequestMessage,
  Configuration,
  CreateChatCompletionResponse,
  OpenAIApi,
} from 'openai';
import type { OpenAIConfig } from './config';
import type { IOpenAIClient } from './types';
import { pipeStreamingResponse } from './pipe_streaming_response';

export class OpenAIClient implements IOpenAIClient {
  private readonly client: OpenAIApi;

  constructor(private readonly config: OpenAIConfig) {
    const clientConfig = new Configuration({
      apiKey: config.apiKey,
    });

    this.client = new OpenAIApi(clientConfig);
  }

  chatCompletion: {
    create: (messages: ChatCompletionRequestMessage[]) => Promise<CreateChatCompletionResponse>;
  } = {
    create: async (messages) => {
      const response = await this.client.createChatCompletion(
        {
          messages,
          model: this.config.model,
          stream: true,
        },
        { responseType: 'stream' }
      );

      return pipeStreamingResponse(response);
    },
  };
}
