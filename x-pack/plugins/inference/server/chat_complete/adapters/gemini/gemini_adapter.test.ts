/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processVertexStreamMock } from './gemini_adapter.test.mocks';
import { PassThrough } from 'stream';
import { noop, tap, lastValueFrom, toArray, Subject } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { observableIntoEventSourceStream } from '../../../util/observable_into_event_source_stream';
import { MessageRole, ToolChoiceType } from '@kbn/inference-common';
import { geminiAdapter } from './gemini_adapter';

describe('geminiAdapter', () => {
  const logger = loggerMock.create();
  const executorMock = {
    invoke: jest.fn(),
  } as InferenceExecutor & { invoke: jest.MockedFn<InferenceExecutor['invoke']> };

  beforeEach(() => {
    executorMock.invoke.mockReset();
    processVertexStreamMock.mockReset().mockImplementation(() => tap(noop));
  });

  function getCallParams() {
    const params = executorMock.invoke.mock.calls[0][0].subActionParams as Record<string, any>;
    return {
      messages: params.messages,
      tools: params.tools,
      toolConfig: params.toolConfig,
      systemInstruction: params.systemInstruction,
    };
  }

  describe('#chatComplete()', () => {
    beforeEach(() => {
      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: new PassThrough(),
        };
      });
    });

    it('calls `executor.invoke` with the right fixed parameters', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeStream',
        subActionParams: {
          messages: [
            {
              parts: [{ text: 'question' }],
              role: 'user',
            },
          ],
          tools: [],
          temperature: 0,
          stopSequences: ['\n\nHuman:'],
        },
      });
    });

    it('correctly format tools', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
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

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { tools } = getCallParams();
      expect(tools).toEqual([
        {
          functionDeclarations: [
            {
              description: 'myFunction',
              name: 'myFunction',
              parameters: {
                properties: {},
                type: 'OBJECT',
              },
            },
            {
              description: 'myFunctionWithArgs',
              name: 'myFunctionWithArgs',
              parameters: {
                properties: {
                  foo: {
                    description: 'foo',
                    enum: undefined,
                    type: 'STRING',
                  },
                },
                required: ['foo'],
                type: 'OBJECT',
              },
            },
          ],
        },
      ]);
    });

    it('correctly format messages', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
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
          {
            role: MessageRole.Assistant,
            content: null,
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
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          parts: [
            {
              text: 'question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              text: 'answer',
            },
          ],
          role: 'assistant',
        },
        {
          parts: [
            {
              text: 'another question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              functionCall: {
                args: {
                  foo: 'bar',
                },
                name: 'my_function',
              },
            },
          ],
          role: 'assistant',
        },
        {
          parts: [
            {
              functionResponse: {
                name: '0',
                response: {
                  bar: 'foo',
                },
              },
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('groups messages from the same user', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
          {
            role: MessageRole.User,
            content: 'another question',
          },
          {
            role: MessageRole.Assistant,
            content: 'answer',
          },
          {
            role: MessageRole.Assistant,
            content: null,
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
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          parts: [
            {
              text: 'question',
            },
            {
              text: 'another question',
            },
          ],
          role: 'user',
        },
        {
          parts: [
            {
              text: 'answer',
            },
            {
              functionCall: {
                args: {
                  foo: 'bar',
                },
                name: 'my_function',
              },
            },
          ],
          role: 'assistant',
        },
      ]);
    });

    it('correctly format system message', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        system: 'Some system message',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { systemInstruction } = getCallParams();
      expect(systemInstruction).toEqual('Some system message');
    });

    it('correctly format tool choice', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        toolChoice: ToolChoiceType.required,
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolConfig } = getCallParams();
      expect(toolConfig).toEqual({ mode: 'ANY' });
    });

    it('correctly format tool choice for named function', () => {
      geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        toolChoice: { function: 'foobar' },
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolConfig } = getCallParams();
      expect(toolConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['foobar'] });
    });

    it('process response events via processVertexStream', async () => {
      const source$ = new Subject<Record<string, any>>();

      const tapFn = jest.fn();
      processVertexStreamMock.mockImplementation(() => tap(tapFn));

      executorMock.invoke.mockImplementation(async () => {
        return {
          actionId: '',
          status: 'ok',
          data: observableIntoEventSourceStream(source$, logger),
        };
      });

      const response$ = geminiAdapter.chatComplete({
        logger,
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      source$.next({ chunk: 1 });
      source$.next({ chunk: 2 });
      source$.complete();

      const allChunks = await lastValueFrom(response$.pipe(toArray()));

      expect(allChunks).toEqual([{ chunk: 1 }, { chunk: 2 }]);

      expect(tapFn).toHaveBeenCalledTimes(2);
      expect(tapFn).toHaveBeenCalledWith({ chunk: 1 });
      expect(tapFn).toHaveBeenCalledWith({ chunk: 2 });
    });
  });
});
