/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import OpenAI from 'openai';
import { openAIAdapter } from '.';
import type { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { ChatCompletionEventType, MessageRole } from '../../../../common/chat_complete';
import { PassThrough } from 'stream';
import { pick } from 'lodash';
import { lastValueFrom, Subject, toArray } from 'rxjs';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import { v4 } from 'uuid';

function createOpenAIChunk({
  delta,
  usage,
}: {
  delta: OpenAI.ChatCompletionChunk['choices'][number]['delta'];
  usage?: OpenAI.ChatCompletionChunk['usage'];
}): OpenAI.ChatCompletionChunk {
  return {
    choices: [
      {
        finish_reason: null,
        index: 0,
        delta,
      },
    ],
    created: new Date().getTime(),
    id: v4(),
    model: 'gpt-4o',
    object: 'chat.completion.chunk',
    usage,
  };
}

describe('openAIAdapter', () => {
  const actionsClientMock = {
    execute: jest.fn(),
  } as ActionsClient & { execute: jest.MockedFn<ActionsClient['execute']> };

  beforeEach(() => {
    actionsClientMock.execute.mockReset();
  });

  const defaultArgs = {
    connector: {
      id: 'foo',
      actionTypeId: '.gen-ai',
      name: 'OpenAI',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
    },
    actionsClient: actionsClientMock,
  };

  describe('when creating the request', () => {
    function getRequest() {
      const params = actionsClientMock.execute.mock.calls[0][0].params.subActionParams as Record<
        string,
        any
      >;

      return { stream: params.stream, body: JSON.parse(params.body) };
    }

    beforeEach(() => {
      actionsClientMock.execute.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: new PassThrough(),
        };
      });
    });
    it('correctly formats messages ', () => {
      openAIAdapter.chatComplete({
        ...defaultArgs,
        system: 'system',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
          {
            role: MessageRole.Assistant,
            content: 'answer',
          },
          {
            role: MessageRole.User,
            content: 'another question',
          },
        ],
      });

      expect(getRequest().body.messages).toEqual([
        {
          content: 'system',
          role: 'system',
        },
        {
          content: 'question',
          role: 'user',
        },
        {
          content: 'answer',
          role: 'assistant',
        },
        {
          content: 'another question',
          role: 'user',
        },
      ]);
    });

    it('correctly formats tools and tool choice', () => {
      openAIAdapter.chatComplete({
        ...defaultArgs,
        system: 'system',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
          {
            role: MessageRole.Assistant,
            content: 'answer',
            toolCalls: [
              {
                function: {
                  name: 'my_function',
                  arguments: {
                    foo: 'bar',
                  },
                },
                toolCallId: '0',
              },
            ],
          },
          {
            role: MessageRole.Tool,
            toolCallId: '0',
            response: {
              bar: 'foo',
            },
          },
        ],
        toolChoice: { function: 'myFunction' },
        tools: {
          myFunction: {
            description: 'myFunction',
          },
          myFunctionWithArgs: {
            description: 'myFunctionWithArgs',
            schema: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  description: 'foo',
                },
              },
              required: ['foo'],
            },
          },
        },
      });

      expect(pick(getRequest().body, 'messages', 'tools', 'tool_choice')).toEqual({
        messages: [
          {
            content: 'system',
            role: 'system',
          },
          {
            content: 'question',
            role: 'user',
          },
          {
            content: 'answer',
            role: 'assistant',
            tool_calls: [
              {
                function: {
                  name: 'my_function',
                  arguments: JSON.stringify({ foo: 'bar' }),
                },
                id: '0',
                type: 'function',
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: '0',
            content: JSON.stringify({ bar: 'foo' }),
          },
        ],
        tools: [
          {
            function: {
              name: 'myFunction',
              description: 'myFunction',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
            type: 'function',
          },
          {
            function: {
              name: 'myFunctionWithArgs',
              description: 'myFunctionWithArgs',
              parameters: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    description: 'foo',
                  },
                },
                required: ['foo'],
              },
            },
            type: 'function',
          },
        ],
        tool_choice: {
          function: {
            name: 'myFunction',
          },
          type: 'function',
        },
      });
    });

    it('always sets streaming to true', () => {
      openAIAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(getRequest().stream).toBe(true);
      expect(getRequest().body.stream).toBe(true);
    });
  });

  describe('when handling the response', () => {
    let source$: Subject<Record<string, any>>;

    beforeEach(() => {
      source$ = new Subject<Record<string, any>>();

      actionsClientMock.execute.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$),
        };
      });
    });

    it('emits chunk events', async () => {
      const response$ = openAIAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
      });

      source$.next(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
        })
      );

      source$.next(
        createOpenAIChunk({
          delta: {
            content: ', second',
          },
        })
      );

      source$.complete();

      const allChunks = await lastValueFrom(response$.pipe(toArray()));

      expect(allChunks).toEqual([
        {
          content: 'First',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: ', second',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });

    it('emits token events', async () => {
      const response$ = openAIAdapter.chatComplete({
        ...defaultArgs,
        messages: [
          {
            role: MessageRole.User,
            content: 'Hello',
          },
        ],
      });

      source$.next(
        createOpenAIChunk({
          delta: {
            content: 'First',
          },
        })
      );

      source$.next(
        createOpenAIChunk({
          delta: {
            tool_calls: [
              {
                index: 0,
                id: '0',
                function: {
                  name: 'my_function',
                  arguments: '{}',
                },
              },
            ],
          },
        })
      );

      source$.complete();

      const allChunks = await lastValueFrom(response$.pipe(toArray()));

      expect(allChunks).toEqual([
        {
          content: 'First',
          tool_calls: [],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
        {
          content: '',
          tool_calls: [
            {
              function: {
                name: 'my_function',
                arguments: '{}',
              },
              index: 0,
              toolCallId: '0',
            },
          ],
          type: ChatCompletionEventType.ChatCompletionChunk,
        },
      ]);
    });
  });
});
