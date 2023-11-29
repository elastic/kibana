/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  useConversation,
  type UseConversationProps,
  type UseConversationResult,
} from './use_conversation';
import {
  act,
  renderHook,
  type RenderHookResult,
  type WrapperComponent,
} from '@testing-library/react-hooks';
import type { ObservabilityAIAssistantService, PendingMessage } from '../types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';
import * as useKibanaModule from './use_kibana';
import { Message, MessageRole } from '../../common';
import { ChatState } from './use_chat';
import { createMockChatService } from '../service/create_mock_chat_service';
import { Subject } from 'rxjs';
import { EMPTY_CONVERSATION_TITLE } from '../i18n';
import { merge, omit } from 'lodash';

let hookResult: RenderHookResult<UseConversationProps, UseConversationResult>;

type MockedService = DeeplyMockedKeys<ObservabilityAIAssistantService>;

const mockService: MockedService = {
  callApi: jest.fn(),
  getCurrentUser: jest.fn(),
  getLicense: jest.fn(),
  getLicenseManagementLocator: jest.fn(),
  isEnabled: jest.fn(),
  start: jest.fn(),
};

const mockChatService = createMockChatService();

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

describe('useConversation', () => {
  let wrapper: WrapperComponent<UseConversationProps>;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = ({ children }) => (
      <ObservabilityAIAssistantProvider value={mockService}>
        {children}
      </ObservabilityAIAssistantProvider>
    );
  });

  describe('with initial messages and a conversation id', () => {
    beforeEach(() => {
      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: { content: '', role: MessageRole.User },
            },
          ],
          initialConversationId: 'foo',
        },
        wrapper,
      });
    });
    it('throws an error', () => {
      expect(hookResult.result.error).toBeTruthy();
    });
  });

  describe('without initial messages and a conversation id', () => {
    beforeEach(() => {
      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
        },
        wrapper,
      });
    });

    it('returns only the system message', () => {
      expect(hookResult.result.current.messages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.System,
          },
        },
      ]);
    });

    it('returns a ready state', () => {
      expect(hookResult.result.current.state).toBe(ChatState.Ready);
    });

    it('does not call the fetch api', () => {
      expect(mockService.callApi).not.toHaveBeenCalled();
    });
  });

  describe('with initial messages', () => {
    beforeEach(() => {
      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                content: 'Test',
                role: MessageRole.User,
              },
            },
          ],
        },
        wrapper,
      });
    });

    it('returns the system message and the initial messages', () => {
      expect(hookResult.result.current.messages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: '',
            role: MessageRole.System,
          },
        },
        {
          '@timestamp': expect.any(String),
          message: {
            content: 'Test',
            role: MessageRole.User,
          },
        },
      ]);
    });
  });

  describe('with a conversation id that successfully loads', () => {
    beforeEach(async () => {
      mockService.callApi.mockResolvedValueOnce({
        conversation: {
          id: 'my-conversation-id',
        },
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: 'System',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'User',
            },
          },
        ],
      });

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialConversationId: 'my-conversation-id',
        },
        wrapper,
      });

      await act(async () => {});
    });

    it('returns the loaded conversation', () => {
      expect(hookResult.result.current.conversation.value).toEqual({
        conversation: {
          id: 'my-conversation-id',
        },
        messages: [
          {
            '@timestamp': expect.any(String),
            message: {
              content: 'System',
              role: MessageRole.System,
            },
          },
          {
            '@timestamp': expect.any(String),
            message: {
              content: 'User',
              role: MessageRole.User,
            },
          },
        ],
      });
    });

    it('sets messages to the messages of the conversation', () => {
      expect(hookResult.result.current.messages).toEqual([
        {
          '@timestamp': expect.any(String),
          message: {
            content: expect.any(String),
            role: MessageRole.System,
          },
        },
        {
          '@timestamp': expect.any(String),
          message: {
            content: 'User',
            role: MessageRole.User,
          },
        },
      ]);
    });

    it('overrides the system message', () => {
      expect(hookResult.result.current.messages[0].message.content).toBe('');
    });
  });

  describe('with a conversation id that fails to load', () => {
    beforeEach(async () => {
      mockService.callApi.mockRejectedValueOnce(new Error('failed to load'));

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialConversationId: 'my-conversation-id',
        },
        wrapper,
      });

      await act(async () => {});
    });

    it('returns an error', () => {
      expect(hookResult.result.current.conversation.error).toBeTruthy();
    });

    it('resets the messages', () => {
      expect(hookResult.result.current.messages.length).toBe(1);
    });
  });

  describe('when chat completes without an initial conversation id', () => {
    let subject: Subject<PendingMessage>;
    const expectedMessages = [
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.System,
          content: '',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.User,
          content: 'Hello',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.Assistant,
          content: 'Goodbye',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.User,
          content: 'Hello again',
        },
      },
      {
        '@timestamp': expect.any(String),
        message: {
          role: MessageRole.Assistant,
          content: 'Goodbye again',
        },
      },
    ];
    beforeEach(() => {
      subject = new Subject();
      mockService.callApi.mockImplementation(async (endpoint, request) =>
        merge(
          {
            conversation: {
              id: 'my-conversation-id',
            },
            messages: expectedMessages,
          },
          (request as any).params.body
        )
      );

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialMessages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: 'Hello',
              },
            },
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.Assistant,
                content: 'Goodbye',
              },
            },
          ],
        },
        wrapper,
      });

      mockChatService.chat.mockImplementationOnce(() => {
        return subject;
      });

      act(() => {
        hookResult.result.current.next(
          hookResult.result.current.messages.concat({
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'Hello again',
            },
          })
        );
      });
    });

    describe('when chat completes with an error', () => {
      beforeEach(async () => {
        mockService.callApi.mockClear();
        act(() => {
          subject.next({
            message: {
              role: MessageRole.Assistant,
              content: 'Goodbye',
            },
            error: new Error(),
          });
          subject.complete();
        });
        await act(async () => {});
      });

      it('does not store the conversation', () => {
        expect(mockService.callApi).not.toHaveBeenCalled();
      });
    });

    describe('when chat completes without an error', () => {
      beforeEach(async () => {
        act(() => {
          subject.next({
            message: {
              role: MessageRole.Assistant,
              content: 'Goodbye again',
            },
          });
          subject.complete();
        });

        await act(async () => {});
      });
      it('the conversation is created including the initial messages', async () => {
        expect(mockService.callApi.mock.calls[0]).toEqual([
          'POST /internal/observability_ai_assistant/conversation',
          {
            params: {
              body: {
                conversation: {
                  '@timestamp': expect.any(String),
                  conversation: {
                    title: EMPTY_CONVERSATION_TITLE,
                  },
                  messages: expectedMessages,
                  labels: {},
                  numeric_labels: {},
                  public: false,
                },
              },
            },
            signal: null,
          },
        ]);

        expect(hookResult.result.current.conversation.error).toBeUndefined();

        expect(hookResult.result.current.messages).toEqual(expectedMessages);
      });
    });
  });

  describe('when chat completes with an initial conversation id', () => {
    let subject: Subject<PendingMessage>;

    const initialMessages: Message[] = [
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.System,
          content: '',
        },
      },
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          content: 'user',
        },
      },
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.Assistant,
          content: 'assistant',
        },
      },
    ];

    beforeEach(async () => {
      mockService.callApi.mockImplementation(async (endpoint, request) => ({
        '@timestamp': new Date().toISOString(),
        conversation: {
          id: 'my-conversation-id',
          title: EMPTY_CONVERSATION_TITLE,
        },
        labels: {},
        numeric_labels: {},
        public: false,
        messages: initialMessages,
      }));

      hookResult = renderHook(useConversation, {
        initialProps: {
          chatService: mockChatService,
          connectorId: 'my-connector',
          initialConversationId: 'my-conversation-id',
        },
        wrapper,
      });

      await act(async () => {});
    });

    it('the conversation is loadeded', async () => {
      expect(mockService.callApi.mock.calls[0]).toEqual([
        'GET /internal/observability_ai_assistant/conversation/{conversationId}',
        {
          signal: expect.anything(),
          params: {
            path: {
              conversationId: 'my-conversation-id',
            },
          },
        },
      ]);

      expect(hookResult.result.current.messages).toEqual(
        initialMessages.map((msg) => ({ ...msg, '@timestamp': expect.any(String) }))
      );
    });

    describe('after chat completes', () => {
      const nextUserMessage: Message = {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          content: 'Hello again',
        },
      };

      const nextAssistantMessage: Message = {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.Assistant,
          content: 'Goodbye again',
        },
      };

      beforeEach(async () => {
        mockService.callApi.mockClear();
        subject = new Subject();

        mockChatService.chat.mockImplementationOnce(() => {
          return subject;
        });

        act(() => {
          hookResult.result.current.next(
            hookResult.result.current.messages.concat(nextUserMessage)
          );
          subject.next(omit(nextAssistantMessage, '@timestamp'));
          subject.complete();
        });

        await act(async () => {});
      });

      it('saves the updated message', () => {
        expect(mockService.callApi.mock.calls[0]).toEqual([
          'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          {
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
              body: {
                conversation: {
                  '@timestamp': expect.any(String),
                  conversation: {
                    title: EMPTY_CONVERSATION_TITLE,
                    id: 'my-conversation-id',
                  },
                  messages: initialMessages
                    .concat([nextUserMessage, nextAssistantMessage])
                    .map((msg) => ({ ...msg, '@timestamp': expect.any(String) })),
                  labels: {},
                  numeric_labels: {},
                  public: false,
                },
              },
            },
            signal: null,
          },
        ]);
      });
    });
  });

  describe('when the title is updated', () => {
    describe('without a stored conversation', () => {
      beforeEach(() => {
        hookResult = renderHook(useConversation, {
          initialProps: {
            chatService: mockChatService,
            connectorId: 'my-connector',
            initialMessages: [
              {
                '@timestamp': new Date().toISOString(),
                message: { content: '', role: MessageRole.User },
              },
            ],
            initialConversationId: 'foo',
          },
          wrapper,
        });
      });

      it('throws an error', () => {
        expect(() => hookResult.result.current.saveTitle('my-new-title')).toThrow();
      });
    });

    describe('with a stored conversation', () => {
      let resolve: (value: unknown) => void;
      beforeEach(async () => {
        mockService.callApi.mockImplementation(async (endpoint, request) => {
          if (
            endpoint === 'PUT /internal/observability_ai_assistant/conversation/{conversationId}'
          ) {
            return new Promise((_resolve) => {
              resolve = _resolve;
            });
          }
          return {
            '@timestamp': new Date().toISOString(),
            conversation: {
              id: 'my-conversation-id',
              title: EMPTY_CONVERSATION_TITLE,
            },
            labels: {},
            numeric_labels: {},
            public: false,
            messages: [],
          };
        });

        await act(async () => {
          hookResult = renderHook(useConversation, {
            initialProps: {
              chatService: mockChatService,
              connectorId: 'my-connector',
              initialConversationId: 'my-conversation-id',
            },
            wrapper,
          });
        });
      });

      it('does not throw an error', () => {
        expect(() => hookResult.result.current.saveTitle('my-new-title')).not.toThrow();
      });

      it('calls the update API', async () => {
        act(() => {
          hookResult.result.current.saveTitle('my-new-title');
        });

        expect(resolve).not.toBeUndefined();

        expect(mockService.callApi.mock.calls[1]).toEqual([
          'PUT /internal/observability_ai_assistant/conversation/{conversationId}',
          {
            signal: null,
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
              body: {
                conversation: {
                  '@timestamp': expect.any(String),
                  conversation: {
                    title: 'my-new-title',
                    id: 'my-conversation-id',
                  },
                  labels: expect.anything(),
                  messages: expect.anything(),
                  numeric_labels: expect.anything(),
                  public: expect.anything(),
                },
              },
            },
          },
        ]);

        mockService.callApi.mockImplementation(async (endpoint, request) => {
          return {
            '@timestamp': new Date().toISOString(),
            conversation: {
              id: 'my-conversation-id',
              title: 'my-new-title',
            },
            labels: {},
            numeric_labels: {},
            public: false,
            messages: [],
          };
        });

        await act(async () => {
          resolve({
            conversation: {
              title: 'my-new-title',
            },
          });
        });

        expect(mockService.callApi.mock.calls[2]).toEqual([
          'GET /internal/observability_ai_assistant/conversation/{conversationId}',
          {
            signal: expect.anything(),
            params: {
              path: {
                conversationId: 'my-conversation-id',
              },
            },
          },
        ]);

        expect(hookResult.result.current.conversation.value?.conversation.title).toBe(
          'my-new-title'
        );
      });
    });
  });
});
