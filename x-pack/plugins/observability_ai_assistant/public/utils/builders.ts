/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Conversation, Message, MessageRole } from '../../common/types';

const currentDate = new Date();

const baseMessage: Message = {
  '@timestamp': String(new Date(currentDate.getTime())),
  message: {
    content: 'foo',
    name: 'bar',
    role: MessageRole.User,
  },
};

export function buildMessage(params: Partial<Message> = {}): Message {
  return cloneDeep({ ...baseMessage, ...params });
}

export function buildSystemInnerMessage(
  params: Partial<Message['message']> = {}
): Message['message'] {
  return cloneDeep({
    ...{ role: MessageRole.System, ...params },
  });
}

export function buildUserInnerMessage(
  params: Partial<Message['message']> = {}
): Message['message'] {
  return cloneDeep({
    ...{ content: "What's a function?", role: MessageRole.User, ...params },
  });
}

export function buildAssistantInnerMessage(
  params: Partial<Message['message']> = {}
): Message['message'] {
  return cloneDeep({
    ...{
      content: `In computer programming and mathematics, a function is a fundamental concept that represents a relationship between input values and output values. It takes one or more input values (also known as arguments or parameters) and processes them to produce a result, which is the output of the function. The input values are passed to the function, and the function performs a specific set of operations or calculations on those inputs to produce the desired output.
      A function is often defined with a name, which serves as an identifier to call and use the function in the code. It can be thought of as a reusable block of code that can be executed whenever needed, and it helps in organizing code and making it more modular and maintainable.`,
      role: MessageRole.Assistant,
      data: { key: 'value', nestedData: { foo: 'bar' } },
      ...params,
    },
  });
}

export function buildElasticInnerMessage(
  params: Partial<Message['message']> = {}
): Message['message'] {
  return cloneDeep({
    ...{ role: MessageRole.Elastic, data: { key: 'value', nestedData: { foo: 'bar' } }, ...params },
  });
}

export function buildFunctionInnerMessage(
  params: Partial<Message['message']> = {}
): Message['message'] {
  return cloneDeep({
    ...{
      role: MessageRole.Function,
    },
    function_call: {
      name: 'leftpad',
      args: '{ foo: "bar" }',
      trigger: MessageRole.User,
    },
    ...params,
  });
}

const baseConversation: Conversation = {
  '@timestamp': String(Date.now()),
  user: {
    id: 'foo',
    name: 'bar',
  },
  conversation: {
    id: 'conversation-foo',
    title: 'Conversation title',
    last_updated: String(Date.now()),
  },
  messages: [
    buildMessage({ message: buildSystemInnerMessage() }),
    buildMessage({ message: buildUserInnerMessage() }),
    buildMessage({ message: buildAssistantInnerMessage() }),
  ],
  labels: { foo: 'bar' },
  numeric_labels: { foo: 1 },
  namespace: 'baz',
};

export function buildConversation(params: Partial<Conversation> = {}): Conversation {
  return cloneDeep({ ...baseConversation, ...params });
}
