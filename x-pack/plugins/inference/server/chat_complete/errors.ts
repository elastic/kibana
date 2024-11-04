/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskError, type UnvalidatedToolCall } from '@kbn/inference-common';
import { i18n } from '@kbn/i18n';
import {
  ChatCompletionErrorCode,
  ChatCompletionTokenLimitReachedError,
  ChatCompletionToolNotFoundError,
  ChatCompletionToolValidationError,
} from '@kbn/inference-common/src/chat_complete/errors';

export function createTokenLimitReachedError(
  tokenLimit?: number,
  tokenCount?: number
): ChatCompletionTokenLimitReachedError {
  return new InferenceTaskError(
    ChatCompletionErrorCode.TokenLimitReachedError,
    i18n.translate('xpack.inference.chatCompletionError.tokenLimitReachedError', {
      defaultMessage: `Token limit reached. Token limit is {tokenLimit}, but the current conversation has {tokenCount} tokens.`,
      values: { tokenLimit, tokenCount },
    }),
    { tokenLimit, tokenCount }
  );
}

export function createToolNotFoundError(name: string): ChatCompletionToolNotFoundError {
  return new InferenceTaskError(
    ChatCompletionErrorCode.ToolNotFoundError,
    `Tool ${name} called but was not available`,
    {
      name,
    }
  );
}

export function createToolValidationError(
  message: string,
  meta: {
    name?: string;
    arguments?: string;
    errorsText?: string;
    toolCalls?: UnvalidatedToolCall[];
  }
): ChatCompletionToolValidationError {
  return new InferenceTaskError(ChatCompletionErrorCode.ToolValidationError, message, meta);
}
