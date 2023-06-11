/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai';
import { Readable } from 'stream';

export interface IOpenAIClient {
  chatCompletion: {
    create<TStreaming extends boolean = true>(
      messages: ChatCompletionRequestMessage[],
      stream?: TStreaming
    ): TStreaming extends false ? Promise<CreateChatCompletionResponse> : Promise<Readable>;
  };
}

export interface CoPilotResourceNames {
  componentTemplate: {
    conversations: string;
    messages: string;
  };
  indexTemplate: {
    conversations: string;
    messages: string;
  };
  ilmPolicy: {
    conversationsAndMessages: string;
  };
  concreteIndices: {
    conversations: string;
    messages: string;
  };
  indexPatterns: {
    conversations: string;
    messages: string;
  };
}
