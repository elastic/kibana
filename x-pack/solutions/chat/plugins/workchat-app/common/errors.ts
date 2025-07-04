/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerSentEventError } from '@kbn/sse-utils';

export type ChatErrorCode = 'internalError' | 'connectorNotFound';

export interface ErrorEvent {
  type: 'error';
  error: {
    code: ChatErrorCode;
    message: string;
    meta: Record<string, unknown>;
  };
}

/**
 * Represents an error that can be thrown by the chat API.
 */
export class ChatError extends ServerSentEventError<ChatErrorCode, Record<string, unknown>> {
  constructor(code: ChatErrorCode, message: string, meta: Record<string, unknown> = {}) {
    super(code, message, meta);
  }
}

export const isChatError = (error: unknown): error is ChatError => {
  return error instanceof ChatError;
};

export const createChatError = (
  code: ChatErrorCode,
  message: string,
  meta: Record<string, unknown> = {}
): ChatError => {
  return new ChatError(code, message, meta);
};
