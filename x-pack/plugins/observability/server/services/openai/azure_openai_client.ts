/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai';
import { Readable } from 'stream';
import { format } from 'url';
import { AzureOpenAIConfig } from './config';
import { pipeStreamingResponse } from './pipe_streaming_response';
import { IOpenAIClient } from './types';

export class AzureOpenAIClient implements IOpenAIClient {
  constructor(private readonly config: AzureOpenAIConfig) {}

  chatCompletion: {
    create: (
      messages: ChatCompletionRequestMessage[]
    ) => Promise<CreateChatCompletionResponse | Readable>;
  } = {
    create: async (messages) => {
      const response = await axios.post(
        format({
          host: `${this.config.resourceName}.openai.azure.com`,
          pathname: `/openai/deployments/${this.config.deploymentId}/chat/completions`,
          protocol: 'https',
          query: {
            'api-version': '2023-05-15',
          },
        }),
        {
          messages,
          stream: true,
        },
        {
          headers: {
            'api-key': this.config.apiKey,
          },
          responseType: 'stream',
        }
      );

      return pipeStreamingResponse(response);
    },
  };
}
