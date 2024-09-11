/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, MessageRole } from './chat_complete';

function isUserMessage(message: Message): boolean {
  return message.role !== MessageRole.Assistant;
}

export function ensureMultiTurn(messages: Message[]): Message[] {
  const next: Message[] = [];

  messages.forEach((message) => {
    const prevMessage = next[next.length - 1];

    if (prevMessage && isUserMessage(prevMessage) === isUserMessage(message)) {
      next.push({
        content: '-',
        role: isUserMessage(message) ? MessageRole.Assistant : MessageRole.User,
      });
    }

    next.push(message);
  });

  return next;
}
