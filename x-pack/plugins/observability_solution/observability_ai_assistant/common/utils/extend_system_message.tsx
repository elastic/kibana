/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from '../types';

export function extendSystemMessage(messages: Message[], extensions: string[]) {
  const [systemMessage, ...rest] = messages;

  const extendedSystemMessage: Message = {
    ...systemMessage,
    message: {
      ...systemMessage.message,
      content: `${systemMessage.message.content}\n\n${extensions.join('\n\n').trim()}`,
    },
  };

  return [extendedSystemMessage].concat(rest);
}
