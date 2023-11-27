/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { type RenderHookResult, renderHook, act } from '@testing-library/react-hooks';
import { Subject } from 'rxjs';
import { MessageRole } from '../../common';
import type { ObservabilityAIAssistantChatService, PendingMessage } from '../types';
import { type UseChatResult, useChat, type UseChatProps, ChatState } from './use_chat';
import * as useKibanaModule from './use_kibana';

type MockedChatService = DeeplyMockedKeys<ObservabilityAIAssistantChatService>;

const mockChatService: MockedChatService = {
  chat: jest.fn(),
  executeFunction: jest.fn(),
  getContexts: jest.fn().mockReturnValue([{ name: 'core', description: '' }]),
  getFunctions: jest.fn().mockReturnValue([]),
  hasFunction: jest.fn().mockReturnValue(false),
  hasRenderFunction: jest.fn().mockReturnValue(true),
  renderFunction: jest.fn(),
};

const addErrorMock = jest.fn();

jest.spyOn(useKibanaModule, 'useKibana').mockReturnValue({
  services: {
    notifications: {
      toasts: {
        addError: addErrorMock,
      },
    },
  },
} as any);

let hookResult: RenderHookResult<UseChatProps, UseChatResult>;

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initially', () => {
    beforeEach(() => {
      hookResult = renderHook(useChat, {
        initialProps: {
          connectorId: 'my-connector',
          chatService: mockChatService,
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: 'hello',
              },
            },
          ],
        } as UseChatProps,
      });
    });

    it('returns the initial messages including the system message', () => {
      const { messages } = hookResult.result.current;
      expect(messages.length).toBe(2);
      expect(messages[0].message.role).toBe('system');
      expect(messages[1].message.content).toBe('hello');
    });

    it('sets chatState to ready', () => {
      expect(hookResult.result.current.state).toBe(ChatState.Ready);
    });
  });

  describe('when calling next()', () => {
    let subject: Subject<PendingMessage>;

    beforeEach(() => {
      hookResult = renderHook(useChat, {
        initialProps: {
          connectorId: 'my-connector',
          chatService: mockChatService,
          initialMessages: [],
        } as UseChatProps,
      });

      subject = new Subject();

      mockChatService.chat.mockReturnValueOnce(subject);

      act(() => {
        hookResult.result.current.next([
          ...hookResult.result.current.messages,
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'hello',
            },
          },
        ]);
      });
    });

    it('sets the chatState to loading', () => {
      expect(hookResult.result.current.state).toBe(ChatState.Loading);
    });

    describe('after asking for another response', () => {
      beforeEach(() => {
        act(() => {
          hookResult.result.current.next([]);
          subject.next({
            message: {
              role: MessageRole.User,
              content: 'goodbye',
            },
          });
          subject.complete();
        });
      });

      it('shows an empty list of messages', () => {
        expect(hookResult.result.current.messages.length).toBe(1);
        expect(hookResult.result.current.messages[0].message.role).toBe(MessageRole.System);
      });

      it('aborts the running request', () => {
        expect(subject.observed).toBe(false);
      });
    });

    describe('after a partial response', () => {
      it('updates the returned messages', () => {
        act(() => {
          subject.next({
            message: {
              content: 'good',
              role: MessageRole.Assistant,
            },
          });
        });

        expect(hookResult.result.current.messages[2].message.content).toBe('good');
      });
    });

    describe('after a completed response', () => {
      it('updates the returned messages and the loading state', () => {
        act(() => {
          subject.next({
            message: {
              content: 'good',
              role: MessageRole.Assistant,
            },
          });
          subject.next({
            message: {
              content: 'goodbye',
              role: MessageRole.Assistant,
            },
          });
          subject.complete();
        });

        expect(hookResult.result.current.messages[2].message.content).toBe('goodbye');
        expect(hookResult.result.current.state).toBe(ChatState.Ready);
      });
    });

    describe('after aborting a response', () => {
      beforeEach(() => {
        act(() => {
          subject.next({
            message: {
              content: 'good',
              role: MessageRole.Assistant,
            },
            aborted: true,
          });
          subject.complete();
        });
      });

      it('shows the partial message and sets chatState to aborted', () => {
        expect(hookResult.result.current.messages[2].message.content).toBe('good');
        expect(hookResult.result.current.state).toBe(ChatState.Aborted);
      });

      it('does not show an error toast', () => {
        expect(addErrorMock).not.toHaveBeenCalled();
      });
    });

    describe('after a response errors out', () => {
      beforeEach(() => {
        act(() => {
          subject.next({
            message: {
              content: 'good',
              role: MessageRole.Assistant,
            },
            error: new Error('foo'),
          });
          subject.complete();
        });
      });

      it('shows the partial message and sets chatState to error', () => {
        expect(hookResult.result.current.messages[2].message.content).toBe('good');
        expect(hookResult.result.current.state).toBe(ChatState.Error);
      });

      it('shows an error toast', () => {
        expect(addErrorMock).toHaveBeenCalled();
      });
    });

    describe('after the LLM responds with a function call', () => {
      let resolve: (data: any) => void;
      let reject: (error: Error) => void;

      beforeEach(() => {
        mockChatService.executeFunction.mockResolvedValueOnce(
          new Promise((...args) => {
            resolve = args[0];
            reject = args[1];
          })
        );

        act(() => {
          subject.next({
            message: {
              content: '',
              role: MessageRole.Assistant,
              function_call: {
                name: 'my_function',
                arguments: JSON.stringify({ foo: 'bar' }),
                trigger: MessageRole.Assistant,
              },
            },
          });
          subject.complete();
        });
      });

      it('the chat state stays loading', () => {
        expect(hookResult.result.current.state).toBe(ChatState.Loading);
      });

      it('adds a message', () => {
        const { messages } = hookResult.result.current;

        expect(messages.length).toBe(3);
        expect(messages[2]).toEqual({
          '@timestamp': expect.any(String),
          message: {
            content: '',
            function_call: {
              arguments: JSON.stringify({ foo: 'bar' }),
              name: 'my_function',
              trigger: MessageRole.Assistant,
            },
            role: MessageRole.Assistant,
          },
        });
      });

      describe('the function call succeeds', () => {
        beforeEach(async () => {
          subject = new Subject();
          mockChatService.chat.mockReturnValueOnce(subject);

          await act(async () => {
            resolve({ content: { foo: 'bar' }, data: { bar: 'foo' } });
          });
        });

        it('adds a message', () => {
          const { messages } = hookResult.result.current;

          expect(messages.length).toBe(4);
          expect(messages[3]).toEqual({
            '@timestamp': expect.any(String),
            message: {
              content: JSON.stringify({ foo: 'bar' }),
              data: JSON.stringify({ bar: 'foo' }),
              name: 'my_function',
              role: MessageRole.User,
            },
          });
        });

        it('keeps the chat state in loading', () => {
          expect(hookResult.result.current.state).toBe(ChatState.Loading);
        });
        it('sends the function call back to the LLM for a response', () => {
          expect(mockChatService.chat).toHaveBeenCalledTimes(2);
          expect(mockChatService.chat).toHaveBeenLastCalledWith({
            connectorId: 'my-connector',
            messages: hookResult.result.current.messages,
          });
        });
      });

      describe('the function call fails', () => {
        beforeEach(async () => {
          subject = new Subject();
          mockChatService.chat.mockReturnValue(subject);

          await act(async () => {
            reject(new Error('connection error'));
          });
        });

        it('keeps the chat state in loading', () => {
          expect(hookResult.result.current.state).toBe(ChatState.Loading);
        });

        it('adds a message', () => {
          const { messages } = hookResult.result.current;

          expect(messages.length).toBe(4);
          expect(messages[3]).toEqual({
            '@timestamp': expect.any(String),
            message: {
              content: JSON.stringify({
                message: 'Error: connection error',
                error: {},
              }),
              name: 'my_function',
              role: MessageRole.User,
            },
          });
        });

        it('does not show an error toast', () => {
          expect(addErrorMock).not.toHaveBeenCalled();
        });

        it('sends the function call back to the LLM for a response', () => {
          expect(mockChatService.chat).toHaveBeenCalledTimes(2);
          expect(mockChatService.chat).toHaveBeenLastCalledWith({
            connectorId: 'my-connector',
            messages: hookResult.result.current.messages,
          });
        });
      });

      describe('stop() is called', () => {
        beforeEach(() => {
          act(() => {
            hookResult.result.current.stop();
          });
        });

        it('sets the chatState to aborted', () => {
          expect(hookResult.result.current.state).toBe(ChatState.Aborted);
        });

        it('has called the abort controller', () => {
          const signal = mockChatService.executeFunction.mock.calls[0][0].signal;

          expect(signal.aborted).toBe(true);
        });

        it('is not updated after the promise is rejected', () => {
          const numRenders = hookResult.result.all.length;

          act(() => {
            reject(new Error('Request aborted'));
          });

          expect(numRenders).toBe(hookResult.result.all.length);
        });

        it('removes all subscribers', () => {
          expect(subject.observed).toBe(false);
        });
      });

      describe('setMessages() is called', () => {});
    });
  });

  describe('when calling next() with the recall function available', () => {
    let subject: Subject<PendingMessage>;

    beforeEach(async () => {
      hookResult = renderHook(useChat, {
        initialProps: {
          connectorId: 'my-connector',
          chatService: mockChatService,
          initialMessages: [],
        } as UseChatProps,
      });

      subject = new Subject();

      mockChatService.hasFunction.mockReturnValue(true);
      mockChatService.executeFunction.mockResolvedValueOnce({
        content: [
          {
            id: 'my_document',
            text: 'My text',
          },
        ],
      });

      mockChatService.chat.mockReturnValueOnce(subject);

      await act(async () => {
        hookResult.result.current.next([
          ...hookResult.result.current.messages,
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'hello',
            },
          },
        ]);
      });
    });

    it('adds a user message and a recall function request', () => {
      expect(hookResult.result.current.messages[1].message.content).toBe('hello');
      expect(hookResult.result.current.messages[2].message.function_call?.name).toBe('recall');
      expect(hookResult.result.current.messages[2].message.content).toBe('');
      expect(hookResult.result.current.messages[2].message.function_call?.arguments).toBe(
        JSON.stringify({ queries: [], contexts: [] })
      );
      expect(hookResult.result.current.messages[3].message.name).toBe('recall');
      expect(hookResult.result.current.messages[3].message.content).toBe(
        JSON.stringify([
          {
            id: 'my_document',
            text: 'My text',
          },
        ])
      );
    });

    it('executes the recall function', () => {
      expect(mockChatService.executeFunction).toHaveBeenCalled();
      expect(mockChatService.executeFunction).toHaveBeenCalledWith({
        signal: expect.any(AbortSignal),
        connectorId: 'my-connector',
        args: JSON.stringify({ queries: [], contexts: [] }),
        name: 'recall',
        messages: [...hookResult.result.current.messages.slice(0, -1)],
      });
    });

    it('sends the user message, function request and recall response to the LLM', () => {
      expect(mockChatService.chat).toHaveBeenCalledWith({
        connectorId: 'my-connector',
        messages: [...hookResult.result.current.messages],
      });
    });
  });
});
