/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantScreenContext } from '@kbn/observability-ai-assistant-plugin/common/types';

interface ConverseOptions {
  screenContexts?: ObservabilityAIAssistantScreenContext[];
}

export interface ConverseParams {
  messages: string;
  conversationId?: string;
  options?: ConverseOptions;
  scope?: AssistantScope;
}

export interface ChatMessage {
  content: string;
  role?: string;
  [key: string]: any;
}

export interface ConverseResponse {
  conversationId?: string;
  messages: ChatMessage[];
  errors: any[];
  steps?: any[];
}

export interface ChatClient {
  converse(params: ConverseParams): Promise<ConverseResponse>;
}
