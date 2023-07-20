/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Message, MessageRole } from '../../common/types';

const baseMessage: Message = {
  '@timestamp': String(new Date().getUTCMilliseconds()),
  message: {
    content: 'foo',
    name: 'bar',
    role: MessageRole.User,
  },
};

export function buildMessage(params: Partial<Message> = {}): Message {
  return cloneDeep({ ...baseMessage, ...params });
}

export function buildUserMessage(params: Partial<Message> = {}): Message {
  return cloneDeep({
    ...baseMessage,
    ...{ message: { content: "What's this function?", role: MessageRole.User } },
    ...params,
  });
}

export function buildAssistantMessage(params: Partial<Message> = {}): Message {
  return cloneDeep({
    ...baseMessage,
    ...{
      message: {
        content: 'This is "leftpad":',
        role: MessageRole.Assistant,
        data: { key: 'value', nestedData: { foo: 'bar' } },
      },
    },
    ...params,
  });
}

export function buildElasticMessage(params: Partial<Message> = {}): Message {
  return cloneDeep({
    ...baseMessage,
    ...{
      message: { role: MessageRole.Elastic, data: { key: 'value', nestedData: { foo: 'bar' } } },
    },
    ...params,
  });
}

export function buildFunctionMessage(params: Partial<Message> = {}): Message {
  return cloneDeep({
    ...baseMessage,
    ...{
      message: { role: MessageRole.Function },
      function_call: {
        name: 'leftpad',
        args: '{ foo: "bar" }',
        trigger: MessageRole.User,
      },
    },
    ...params,
  });
}
