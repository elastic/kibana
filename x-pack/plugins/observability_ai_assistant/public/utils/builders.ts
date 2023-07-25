/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Message, MessageRole } from '../../common/types';

const baseMessage: Message = {
  '@timestamp': String(Date.now()),
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
    ...{ content: "What's this function?", role: MessageRole.User, ...params },
  });
}

export function buildAssistantInnerMessage(
  params: Partial<Message['message']> = {}
): Message['message'] {
  return cloneDeep({
    ...{
      content: 'This is "leftpad":',
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
