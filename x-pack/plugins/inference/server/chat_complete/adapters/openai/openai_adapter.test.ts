/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import OpenAI from 'openai';
import { v4 } from 'uuid';
import { PassThrough } from 'stream';
import { pick } from 'lodash';
import { lastValueFrom, Subject, toArray } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { ChatCompletionEventType, MessageRole } from '@kbn/inference-common';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import { InferenceExecutor } from '../../utils/inference_executor';
import { openAIAdapter } from '.';

function createOpenAIChunk({
  delta,
  usage,
}: {
  delta?: OpenAI.ChatCompletionChunk['choices'][number]['delta'];
  usage?: OpenAI.ChatCompletionChunk['usage'];
}): OpenAI.ChatCompletionChunk {
  return {
    choices: delta
      ? [
          {
            finish_reason: null,
            index: 0,
            delta,
          },
        ]
      : [],
    created: new Date().getTime(),
    id: v4(),
    model: 'gpt-4o',
    object: 'chat.completion.chunk',
    usage,
  };
}

describe('openAIAdapter', () => {
  const executorMock = {
    invoke: jest.fn(),
  } as InferenceExecutor & { invoke: jest.MockedFn<InferenceExecutor['invoke']> };

  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    executorMock.invoke.mockReset();
  });

  const defaultArgs = {
    executor: executorMock,
    logger: loggerMock.create(),
  };

  describe('when creating the request', () => {
    function getRequest() {
      const params = executorMock.invoke.mock.calls[0][0].subActionParams as Record<string, any>;

      return { stream: params.stream, body: JSON.parse(params.body) };
    }

    beforeEach(() => {
      executorMock.invoke.mockImplementation(async () => {
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

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
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

    it('emits chunk events with tool calls', async () => {
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

    it('emits token count events', async () => {
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
            content: 'chunk',
          },
        })
      );

      source$.next(
        createOpenAIChunk({
          usage: {
            prompt_tokens: 50,
            completion_tokens: 100,
            total_tokens: 150,
          },
        })
      );

      source$.complete();

      const allChunks = await lastValueFrom(response$.pipe(toArray()));

      expect(allChunks).toEqual([
        {
          type: ChatCompletionEventType.ChatCompletionChunk,
          content: 'chunk',
          tool_calls: [],
        },
        {
          type: ChatCompletionEventType.ChatCompletionTokenCount,
          tokens: {
            prompt: 50,
            completion: 100,
            total: 150,
          },
        },
      ]);
    });
  });
});
