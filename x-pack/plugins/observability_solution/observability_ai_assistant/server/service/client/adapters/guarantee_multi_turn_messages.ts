/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { Message, MessageRole } from '../../../../common';

function isAssistantMessage(message: Message) {
  return (
    message.message.role === MessageRole.Assistant || message.message.role === MessageRole.Elastic
  );
}

function isUserMessage(message: Message) {
  return message.message.role === MessageRole.User;
}

export function guaranteeMultiTurnMessages(messages: Message[]) {
  return messages.reduce((prev, current) => {
    const prevMessage = last(prev);
    if (
      prevMessage &&
      prevMessage.message.role !== MessageRole.System &&
      isUserMessage(current) !== isAssistantMessage(prevMessage)
    ) {
      prev.push({
        '@timestamp': prevMessage['@timestamp'],
        message: {
          content: 'Acknowledged',
          role: isUserMessage(current) ? MessageRole.Assistant : MessageRole.User,
        },
      });
    }

    prev.push(current);
    return prev;
  }, [] as Message[]);
}
