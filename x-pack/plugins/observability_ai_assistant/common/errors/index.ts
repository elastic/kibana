/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ChatCompletionErrorCode {
  InternalError = 'internalError',
}

export class ChatCompletionError extends Error {
  code: ChatCompletionErrorCode;

  constructor(code: ChatCompletionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function isChatCompletionError(error: Error): error is ChatCompletionError {
  return error instanceof ChatCompletionError;
}
