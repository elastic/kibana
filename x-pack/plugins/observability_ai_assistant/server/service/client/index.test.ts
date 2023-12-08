/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { merge } from 'lodash';
import { Subject } from 'rxjs';
import { PassThrough, type Readable } from 'stream';
import { finished } from 'stream/promises';
import { ObservabilityAIAssistantClient } from '.';
import { createResourceNamesMap } from '..';
import { MessageRole, type Message } from '../../../common';
import { StreamingChatResponseEventType } from '../../../common/conversation_complete';
import type { CreateChatCompletionResponseChunk } from '../../../public/types';
import type { ChatFunctionClient } from '../chat_function_client';
import type { KnowledgeBaseService } from '../knowledge_base_service';

type ChunkDelta = CreateChatCompletionResponseChunk['choices'][number]['delta'];

type LlmSimulator = ReturnType<typeof createLlmSimulator>;

const nextTick = () => {
  return new Promise(process.nextTick);
};

const waitForNextWrite = async (stream: Readable): Promise<void> => {
  // this will fire before the client's internal write() promise is
  // resolved
  await new Promise((resolve) => stream.once('data', resolve));
  // so we wait another tick to let the client move to the next step
  await nextTick();
};

function createLlmSimulator() {
  const stream = new PassThrough();

  return {
    stream,
    next: async (msg: ChunkDelta) => {
      const chunk: CreateChatCompletionResponseChunk = {
        created: 0,
        id: '',
        model: 'gpt-4',
        object: 'chat.completion.chunk',
        choices: [
          {
            delta: msg,
          },
        ],
      };
      await new Promise<void>((resolve, reject) => {
        stream.write(`data: ${JSON.stringify(chunk)}\n`, undefined, (err) => {
          return err ? reject(err) : resolve();
        });
      });
    },
    complete: async () => {
      if (stream.destroyed) {
        throw new Error('Stream is already destroyed');
      }
      await new Promise((resolve) => stream.write('data: [DONE]', () => stream.end(resolve)));
    },
    error: (error: Error) => {
      stream.destroy(error);
    },
  };
}

describe('Observability AI Assistant service', () => {
  let client: ObservabilityAIAssistantClient;

  const actionsClientMock: DeeplyMockedKeys<ActionsClient> = {
    execute: jest.fn(),
  } as any;

  const esClientMock: DeeplyMockedKeys<ElasticsearchClient> = {
    search: jest.fn(),
    index: jest.fn(),
    update: jest.fn(),
  } as any;

  const knowledgeBaseServiceMock: DeeplyMockedKeys<KnowledgeBaseService> = {
    recall: jest.fn(),
  } as any;

  const loggerMock: DeeplyMockedKeys<Logger> = {
    log: jest.fn(),
    error: jest.fn(),
  } as any;

  const functionClientMock: DeeplyMockedKeys<ChatFunctionClient> = {
    executeFunction: jest.fn(),
    getFunctions: jest.fn().mockReturnValue([]),
    hasFunction: jest.fn().mockImplementation((name) => {
      return name !== 'recall';
    }),
  } as any;

  let llmSimulator: LlmSimulator;

  function createClient() {
    jest.clearAllMocks();

    return new ObservabilityAIAssistantClient({
      actionsClient: actionsClientMock,
      esClient: esClientMock,
      knowledgeBaseService: knowledgeBaseServiceMock,
      logger: loggerMock,
      namespace: 'default',
      resources: createResourceNamesMap(),
      user: {
        name: 'johndoe',
      },
    });
  }

  function system(content: string | Omit<Message['message'], 'role'>): Message {
    return merge(
      {
        '@timestamp': new Date().toString(),
        message: {
          role: MessageRole.System,
        },
      },
      typeof content === 'string' ? { message: { content } } : content
    );
  }

  function user(content: string | Omit<Message['message'], 'role'>): Message {
    return merge(
      {
        '@timestamp': new Date().toString(),
        message: {
          role: MessageRole.User,
        },
      },
      typeof content === 'string' ? { message: { content } } : content
    );
  }

  describe('when completing a conversation without an initial conversation id', () => {
    let stream: Readable;

    let titleLlmPromiseResolve: (title: string) => void;
    let titleLlmPromiseReject: Function;

    beforeEach(async () => {
      client = createClient();
      actionsClientMock.execute
        .mockImplementationOnce(async () => {
          llmSimulator = createLlmSimulator();
          return {
            actionId: '',
            status: 'ok',
            data: llmSimulator.stream,
          };
        })
        .mockImplementationOnce(() => {
          return new Promise((resolve, reject) => {
            titleLlmPromiseResolve = (title: string) => {
              const titleLlmSimulator = createLlmSimulator();
              titleLlmSimulator.next({ content: title });
              titleLlmSimulator.complete();
              resolve({
                actionId: '',
                status: 'ok',
                data: titleLlmSimulator.stream,
              });
            };
            titleLlmPromiseReject = reject;
          });
        });

      stream = await client.complete({
        connectorId: 'foo',
        messages: [system('This is a system message'), user('How many alerts do I have?')],
        functionClient: functionClientMock,
        signal: new AbortController().signal,
        persist: true,
      });
    });

    describe('when streaming the response from the LLM', () => {
      let dataHandler: jest.Mock;

      beforeEach(async () => {
        dataHandler = jest.fn();

        stream.on('data', dataHandler);

        await llmSimulator.next({ content: 'Hello' });
      });

      it('calls the actions client with the messages', () => {
        expect(actionsClientMock.execute.mock.calls[0]).toEqual([
          {
            actionId: 'foo',
            params: {
              subAction: 'stream',
              subActionParams: {
                body: expect.any(String),
                stream: true,
              },
            },
          },
        ]);
      });

      it('calls the llm again to generate a new title', () => {
        expect(actionsClientMock.execute.mock.calls[1]).toEqual([
          {
            actionId: 'foo',
            params: {
              subAction: 'stream',
              subActionParams: {
                body: expect.any(String),
                stream: true,
              },
            },
          },
        ]);
      });

      it('incrementally streams the response to the client', () => {
        expect(dataHandler).toHaveBeenCalledTimes(1);

        expect(JSON.parse(dataHandler.mock.calls[0])).toEqual({
          id: expect.any(String),
          message: {
            content: 'Hello',
          },
          type: StreamingChatResponseEventType.ChatCompletionChunk,
        });
      });

      describe('after the LLM errors out', () => {
        beforeEach(async () => {
          await llmSimulator.next({ content: ' again' });

          llmSimulator.error(new Error('Unexpected error'));

          await finished(stream);
        });

        it('adds an error to the stream and closes it', () => {
          expect(dataHandler).toHaveBeenCalledTimes(3);

          expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
            error: {
              message: 'Unexpected error',
              stack: expect.any(String),
            },
            type: StreamingChatResponseEventType.ConversationCompletionError,
          });
        });
      });

      describe('when generating a title fails', () => {
        beforeEach(async () => {
          titleLlmPromiseReject(new Error('Failed generating title'));

          await nextTick();

          await llmSimulator.complete();

          await finished(stream);
        });

        it('falls back to the default title', () => {
          expect(JSON.parse(dataHandler.mock.calls[2])).toEqual({
            conversation: {
              title: 'New conversation',
              id: expect.any(String),
              last_updated: expect.any(String),
            },
            type: StreamingChatResponseEventType.ConversationCreate,
          });

          expect(loggerMock.error).toHaveBeenCalled();
        });
      });

      describe('after completing the response from the LLM', () => {
        beforeEach(async () => {
          await llmSimulator.next({ content: ' again' });

          titleLlmPromiseResolve('An auto-generated title');

          await nextTick();

          await llmSimulator.complete();

          await finished(stream);
        });
        it('adds the completed message to the stream', () => {
          expect(JSON.parse(dataHandler.mock.calls[1])).toEqual({
            id: expect.any(String),
            message: {
              content: ' again',
            },
            type: StreamingChatResponseEventType.ChatCompletionChunk,
          });

          expect(JSON.parse(dataHandler.mock.calls[2])).toEqual({
            id: expect.any(String),
            message: {
              '@timestamp': expect.any(String),
              message: {
                content: 'Hello again',
                role: MessageRole.Assistant,
                function_call: {
                  arguments: '',
                  name: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
            type: StreamingChatResponseEventType.MessageAdd,
          });
        });

        it('creates a new conversation with the automatically generated title', () => {
          expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
            conversation: {
              title: 'An auto-generated title',
              id: expect.any(String),
              last_updated: expect.any(String),
            },
            type: StreamingChatResponseEventType.ConversationCreate,
          });

          expect(esClientMock.index).toHaveBeenCalledWith({
            index: '.kibana-observability-ai-assistant-conversations',
            refresh: true,
            document: {
              '@timestamp': expect.any(String),
              conversation: {
                id: expect.any(String),
                last_updated: expect.any(String),
                title: 'An auto-generated title',
              },
              labels: {},
              numeric_labels: {},
              public: false,
              namespace: 'default',
              user: {
                name: 'johndoe',
              },
              messages: [
                {
                  '@timestamp': expect.any(String),
                  message: {
                    content: 'This is a system message',
                    role: MessageRole.System,
                  },
                },
                {
                  '@timestamp': expect.any(String),
                  message: {
                    content: 'How many alerts do I have?',
                    role: MessageRole.User,
                  },
                },
                {
                  '@timestamp': expect.any(String),
                  message: {
                    content: 'Hello again',
                    role: MessageRole.Assistant,
                    function_call: {
                      name: '',
                      arguments: '',
                      trigger: MessageRole.Assistant,
                    },
                  },
                },
              ],
            },
          });
        });
      });
    });
  });

  describe('when completig a conversation with an initial conversation id', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    beforeEach(async () => {
      client = createClient();
      actionsClientMock.execute.mockImplementationOnce(async () => {
        llmSimulator = createLlmSimulator();
        return {
          actionId: '',
          status: 'ok',
          data: llmSimulator.stream,
        };
      });

      esClientMock.search.mockImplementation(async () => {
        return {
          hits: {
            hits: [
              {
                _id: 'my-es-document-id',
                _index: '.kibana-observability-ai-assistant-conversations',
                _source: {
                  '@timestamp': new Date().toISOString(),
                  conversation: {
                    id: 'my-conversation-id',
                    title: 'My stored conversation',
                    last_updated: new Date().toISOString(),
                  },
                  labels: {},
                  numeric_labels: {},
                  public: false,
                  messages: [
                    system('This is a system message'),
                    user('How many alerts do I have?'),
                  ],
                },
              },
            ],
          },
        } as any;
      });

      esClientMock.update.mockImplementationOnce(async () => {
        return {} as any;
      });

      stream = await client.complete({
        connectorId: 'foo',
        messages: [system('This is a system message'), user('How many alerts do I have?')],
        functionClient: functionClientMock,
        signal: new AbortController().signal,
        conversationId: 'my-conversation-id',
        persist: true,
      });

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await llmSimulator.next({ content: 'Hello' });

      await llmSimulator.complete();

      await finished(stream);
    });

    it('updates the conversation', () => {
      expect(JSON.parse(dataHandler.mock.calls[2])).toEqual({
        conversation: {
          title: 'My stored conversation',
          id: expect.any(String),
          last_updated: expect.any(String),
        },
        type: StreamingChatResponseEventType.ConversationUpdate,
      });

      expect(esClientMock.update).toHaveBeenCalledWith({
        refresh: true,
        index: '.kibana-observability-ai-assistant-conversations',
        id: 'my-es-document-id',
        doc: {
          '@timestamp': expect.any(String),
          conversation: {
            id: expect.any(String),
            last_updated: expect.any(String),
            title: 'My stored conversation',
          },
          labels: {},
          numeric_labels: {},
          public: false,
          namespace: 'default',
          user: {
            name: 'johndoe',
          },
          messages: [
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'This is a system message',
                role: MessageRole.System,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'How many alerts do I have?',
                role: MessageRole.User,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'Hello',
                role: MessageRole.Assistant,
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('when the LLM response fails', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    beforeEach(async () => {
      client = createClient();
      actionsClientMock.execute.mockImplementationOnce(async () => {
        llmSimulator = createLlmSimulator();
        return {
          actionId: '',
          status: 'ok',
          data: llmSimulator.stream,
        };
      });

      stream = await client.complete({
        connectorId: 'foo',
        messages: [system('This is a system message'), user('How many alerts do I have?')],
        functionClient: functionClientMock,
        signal: new AbortController().signal,
        title: 'My predefined title',
        persist: true,
      });

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await llmSimulator.next({ content: 'Hello' });

      await new Promise((resolve) =>
        llmSimulator.stream.write(
          `data: ${JSON.stringify({
            error: {
              message: 'Connection unexpectedly closed',
            },
          })}\n`,
          resolve
        )
      );

      await llmSimulator.complete();

      await finished(stream);
    });

    it('ends the stream and writes an error', async () => {
      expect(JSON.parse(dataHandler.mock.calls[1])).toEqual({
        error: {
          message: 'Connection unexpectedly closed',
          stack: expect.any(String),
        },
        type: StreamingChatResponseEventType.ConversationCompletionError,
      });
    });

    it('does not create or update the conversation', async () => {
      expect(esClientMock.index).not.toHaveBeenCalled();
      expect(esClientMock.update).not.toHaveBeenCalled();
    });
  });

  describe('when the assistant answers with a function request', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;

    let respondFn: jest.Mock;

    let fnResponseResolve: (data: unknown) => void;

    let fnResponseReject: (error: Error) => void;

    beforeEach(async () => {
      client = createClient();
      actionsClientMock.execute.mockImplementationOnce(async () => {
        llmSimulator = createLlmSimulator();
        return {
          actionId: '',
          status: 'ok',
          data: llmSimulator.stream,
        };
      });

      respondFn = jest.fn();

      functionClientMock.getFunctions.mockImplementation(() => [
        {
          definition: {
            name: 'myFunction',
            contexts: ['core'],
            description: 'my-description',
            descriptionForUser: '',
            parameters: {
              type: 'object',
              additionalProperties: false,
              properties: {
                foo: {
                  type: 'string',
                  enum: ['bar'],
                },
              },
              required: ['foo'],
            },
          },
          respond: respondFn,
        },
      ]);

      functionClientMock.executeFunction.mockImplementationOnce(() => {
        return new Promise<any>((resolve, reject) => {
          fnResponseResolve = resolve;
          fnResponseReject = reject;
        });
      });

      stream = await client.complete({
        connectorId: 'foo',
        messages: [system('This is a system message'), user('How many alerts do I have?')],
        functionClient: functionClientMock,
        signal: new AbortController().signal,
        title: 'My predefined title',
        persist: true,
      });

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await llmSimulator.next({
        content: 'Hello',
        function_call: { name: 'my-function', arguments: JSON.stringify({ foo: 'bar' }) },
      });

      const prevLlmSimulator = llmSimulator;

      actionsClientMock.execute.mockImplementationOnce(async () => {
        llmSimulator = createLlmSimulator();
        return {
          actionId: '',
          status: 'ok',
          data: llmSimulator.stream,
        };
      });

      await prevLlmSimulator.complete();

      await waitForNextWrite(stream);
    });

    describe('while the function call is pending', () => {
      it('appends the request message', async () => {
        expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              content: 'Hello',
              role: MessageRole.Assistant,
              function_call: {
                name: 'my-function',
                arguments: JSON.stringify({ foo: 'bar' }),
                trigger: MessageRole.Assistant,
              },
            },
          },
        });
      });

      it('executes the function', () => {
        expect(functionClientMock.executeFunction).toHaveBeenCalledWith({
          connectorId: 'foo',
          name: 'my-function',
          args: JSON.stringify({ foo: 'bar' }),
          signal: expect.any(AbortSignal),
          messages: [
            {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.System,
                content: 'This is a system message',
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.User,
                content: 'How many alerts do I have?',
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.Assistant,
                content: 'Hello',
                function_call: {
                  name: 'my-function',
                  arguments: JSON.stringify({ foo: 'bar' }),
                  trigger: MessageRole.Assistant,
                },
              },
            },
          ],
        });
      });

      afterEach(async () => {
        fnResponseResolve({ content: { my: 'content' } });
        await waitForNextWrite(stream);

        await llmSimulator.complete();
        await finished(stream);
      });
    });

    describe('and the function succeeds', () => {
      beforeEach(async () => {
        fnResponseResolve({ content: { my: 'content' } });
        await waitForNextWrite(stream);
      });

      it('appends the function response', () => {
        expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              role: MessageRole.User,
              name: 'my-function',
              content: JSON.stringify({
                my: 'content',
              }),
            },
          },
        });
      });

      it('sends the function response back to the llm', () => {
        expect(actionsClientMock.execute).toHaveBeenCalledTimes(2);
        expect(actionsClientMock.execute.mock.lastCall!).toEqual([
          {
            actionId: 'foo',
            params: {
              subAction: 'stream',
              subActionParams: {
                body: expect.any(String),
                stream: true,
              },
            },
          },
        ]);
      });

      describe('and the assistant replies without a function request', () => {
        beforeEach(async () => {
          await llmSimulator.next({ content: 'I am done here' });
          await llmSimulator.complete();
          await waitForNextWrite(stream);

          await finished(stream);
        });

        it('appends the assistant reply', () => {
          expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: expect.any(String),
            message: {
              content: 'I am done here',
            },
          });
          expect(JSON.parse(dataHandler.mock.calls[4])).toEqual({
            type: StreamingChatResponseEventType.MessageAdd,
            id: expect.any(String),
            message: {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.Assistant,
                content: 'I am done here',
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          });
        });

        it('stores the conversation', () => {
          expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
            type: StreamingChatResponseEventType.ConversationCreate,
            conversation: {
              id: expect.any(String),
              last_updated: expect.any(String),
              title: 'My predefined title',
            },
          });

          expect(esClientMock.index).toHaveBeenCalled();

          expect((esClientMock.index.mock.lastCall![0] as any).document.messages).toEqual([
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'This is a system message',
                role: MessageRole.System,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'How many alerts do I have?',
                role: MessageRole.User,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'Hello',
                role: MessageRole.Assistant,
                function_call: {
                  name: 'my-function',
                  arguments: JSON.stringify({ foo: 'bar' }),
                  trigger: MessageRole.Assistant,
                },
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: JSON.stringify({
                  my: 'content',
                }),
                name: 'my-function',
                role: MessageRole.User,
              },
            },
            {
              '@timestamp': expect.any(String),
              message: {
                content: 'I am done here',
                role: MessageRole.Assistant,
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          ]);
        });
      });
    });

    describe('and the function fails', () => {
      beforeEach(async () => {
        fnResponseReject(new Error('Function failed'));
        await waitForNextWrite(stream);
      });

      it('appends the function response', () => {
        expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              role: MessageRole.User,
              name: 'my-function',
              content: JSON.stringify({
                message: 'Error: Function failed',
                error: {},
              }),
            },
          },
        });
      });

      it('sends the function response back to the llm', () => {
        expect(actionsClientMock.execute).toHaveBeenCalledTimes(2);
        expect(actionsClientMock.execute.mock.lastCall!).toEqual([
          {
            actionId: 'foo',
            params: {
              subAction: 'stream',
              subActionParams: {
                body: expect.any(String),
                stream: true,
              },
            },
          },
        ]);
      });
    });

    describe('and the function responds with an observable', () => {
      let response$: Subject<CreateChatCompletionResponseChunk>;
      beforeEach(async () => {
        response$ = new Subject();
        fnResponseResolve(response$);
        await waitForNextWrite(stream);
      });

      it('appends the function response', () => {
        expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
          type: StreamingChatResponseEventType.MessageAdd,
          id: expect.any(String),
          message: {
            '@timestamp': expect.any(String),
            message: {
              role: MessageRole.User,
              name: 'my-function',
              content: '{}',
            },
          },
        });
      });

      describe('if the observable completes', () => {
        beforeEach(async () => {
          response$.next({
            created: 0,
            id: '',
            model: 'gpt-4',
            object: 'chat.completion.chunk',
            choices: [
              {
                delta: {
                  content: 'Hello',
                },
              },
            ],
          });
          response$.complete();

          await finished(stream);
        });

        it('emits a completion chunk', () => {
          expect(JSON.parse(dataHandler.mock.calls[3])).toEqual({
            type: StreamingChatResponseEventType.ChatCompletionChunk,
            id: expect.any(String),
            message: {
              content: 'Hello',
            },
          });
        });

        it('appends the observable response', () => {
          expect(JSON.parse(dataHandler.mock.calls[4])).toEqual({
            type: StreamingChatResponseEventType.MessageAdd,
            id: expect.any(String),
            message: {
              '@timestamp': expect.any(String),
              message: {
                role: MessageRole.Assistant,
                content: 'Hello',
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
              },
            },
          });
        });
      });

      describe('if the observable errors out', () => {
        beforeEach(async () => {
          response$.next({
            created: 0,
            id: '',
            model: 'gpt-4',
            object: 'chat.completion.chunk',
            choices: [
              {
                delta: {
                  content: 'Hello',
                },
              },
            ],
          });
          response$.error(new Error('Unexpected error'));

          await finished(stream);
        });

        it('appends an error', () => {
          expect(JSON.parse(dataHandler.mock.lastCall!)).toEqual({
            type: StreamingChatResponseEventType.ConversationCompletionError,
            error: {
              message: 'Unexpected error',
              stack: expect.any(String),
            },
          });
        });
      });
    });
  });

  describe('when recall is available', () => {
    let stream: Readable;

    let dataHandler: jest.Mock;
    beforeEach(async () => {
      client = createClient();
      actionsClientMock.execute.mockImplementationOnce(async () => {
        llmSimulator = createLlmSimulator();
        return {
          actionId: '',
          status: 'ok',
          data: llmSimulator.stream,
        };
      });

      functionClientMock.hasFunction.mockReturnValue(true);

      functionClientMock.executeFunction.mockImplementationOnce(async () => {
        return {
          content: [
            {
              id: 'my_document',
              text: 'My document',
            },
          ],
        };
      });

      stream = await client.complete({
        connectorId: 'foo',
        messages: [system('This is a system message'), user('How many alerts do I have?')],
        functionClient: functionClientMock,
        signal: new AbortController().signal,
        persist: false,
      });

      dataHandler = jest.fn();

      stream.on('data', dataHandler);

      await waitForNextWrite(stream);

      await llmSimulator.next({
        content: 'Hello',
      });

      await llmSimulator.complete();

      await finished(stream);
    });

    it('appends the recall request message', () => {
      expect(JSON.parse(dataHandler.mock.calls[0]!)).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.Assistant,
            function_call: {
              name: 'recall',
              arguments: JSON.stringify({ queries: [], contexts: [] }),
              trigger: MessageRole.Assistant,
            },
          },
        },
      });
    });

    it('appends the recall response', () => {
      expect(JSON.parse(dataHandler.mock.calls[1]!)).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: JSON.stringify([{ id: 'my_document', text: 'My document' }]),
            role: MessageRole.User,
            name: 'recall',
          },
        },
      });
    });

    it('appends the response from the LLM', () => {
      expect(JSON.parse(dataHandler.mock.calls[2]!)).toEqual({
        type: StreamingChatResponseEventType.ChatCompletionChunk,
        id: expect.any(String),
        message: {
          content: 'Hello',
        },
      });

      expect(JSON.parse(dataHandler.mock.calls[3]!)).toEqual({
        type: StreamingChatResponseEventType.MessageAdd,
        id: expect.any(String),
        message: {
          '@timestamp': expect.any(String),
          message: {
            content: 'Hello',
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant,
            },
            role: MessageRole.Assistant,
          },
        },
      });
    });
  });
});
