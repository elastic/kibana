/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConverseAttachment {
  id?: string;
  type: string;
  data?: Record<string, unknown>;
  hidden?: boolean;
}

export interface ConverseParams {
  messages: string;
  conversationId?: string;
  attachments?: ConverseAttachment[];
}

export interface ChatMessage {
  content: string;
  role?: string;
  [key: string]: any;
}

export interface ConverseResponse {
  conversationId?: string;
  traceId?: string;
  messages: ChatMessage[];
  errors: any[];
  steps?: any[];
}

export interface ChatClient {
  converse(params: ConverseParams): Promise<ConverseResponse>;
}
