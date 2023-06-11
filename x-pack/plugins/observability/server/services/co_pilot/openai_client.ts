/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Configuration, OpenAIApi } from 'openai';
import type { OpenAIConfig } from './config';
import { pipeStreamingResponse } from './pipe_streaming_response';
import type { IOpenAIClient } from './types';

export class OpenAIClient implements IOpenAIClient {
  private readonly client: OpenAIApi;

  constructor(private readonly config: OpenAIConfig) {
    const clientConfig = new Configuration({
      apiKey: config.apiKey,
    });

    this.client = new OpenAIApi(clientConfig);
  }

  chatCompletion: IOpenAIClient['chatCompletion'] = {
    create: async (messages, streamOverride) => {
      const stream = streamOverride ?? true;

      const response = await this.client.createChatCompletion(
        {
          messages,
          model: this.config.model,
          stream,
        },
        ...(stream ? [{ responseType: 'stream' as const }] : [])
      );

      return stream ? pipeStreamingResponse(response) : response.data;
    },
  };
}
