/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findLastIndex, last } from 'lodash';
import { Message, MessageAddEvent, MessageRole } from '../../../common';
import { createFunctionRequestMessage } from '../../../common/utils/create_function_request_message';
import { CONTEXT_FUNCTION_NAME } from '../../functions/context';

export function getContextFunctionRequestIfNeeded(
  messages: Message[]
): MessageAddEvent | undefined {
  const indexOfLastUserMessage = findLastIndex(
    messages,
    (message) => message.message.role === MessageRole.User && !message.message.name
  );

  const hasContextSinceLastUserMessage = messages
    .slice(indexOfLastUserMessage)
    .some((message) => message.message.name === CONTEXT_FUNCTION_NAME);

  const isLastMessageFunctionRequest = !!last(messages)?.message.function_call?.name;
  if (hasContextSinceLastUserMessage || isLastMessageFunctionRequest) {
    return undefined;
  }

  return createFunctionRequestMessage({ name: CONTEXT_FUNCTION_NAME });
}
