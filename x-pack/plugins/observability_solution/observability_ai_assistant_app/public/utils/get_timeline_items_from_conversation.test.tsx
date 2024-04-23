/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { last, pick } from 'lodash';
import { render } from '@testing-library/react';
import { getTimelineItemsfromConversation } from './get_timeline_items_from_conversation';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ChatState, Message, MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import { createMockChatService } from './create_mock_chat_service';
import { KibanaContextProvider } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana';

const mockChatService = createMockChatService();

let items: ReturnType<typeof getTimelineItemsfromConversation>;

function Providers({ children }: { children: React.ReactElement }) {
  return (
    <IntlProvider locale="en" messages={{}}>
      <KibanaContextProvider
        services={{
          plugins: {
            start: {
              observabilityAIAssistant: {
                useObservabilityAIAssistantChatService: () => mockChatService,
              },
            },
          },
        }}
      >
        {children}
      </KibanaContextProvider>
    </IntlProvider>
  );
}

describe('getTimelineItemsFromConversation', () => {
  describe('returns an opening message only', () => {
    items = getTimelineItemsfromConversation({
      chatService: mockChatService,
      hasConnector: true,
      messages: [],
      chatState: ChatState.Ready,
      onActionClick: jest.fn(),
    });

    expect(items.length).toBe(1);
    expect(items[0].title).toBe('started a conversation');
  });

  describe('with a start of a conversation', () => {
    beforeEach(() => {
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        currentUser: {
          username: 'johndoe',
          full_name: 'John Doe',
        },
        chatState: ChatState.Ready,
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
        onActionClick: jest.fn(),
      });
    });
    it('excludes the system message', () => {
      expect(items.length).toBe(2);
      expect(items[0].title).toBe('started a conversation');
    });

    it('includes the rest of the conversation', () => {
      expect(items[1].currentUser?.full_name).toEqual('John Doe');
      expect(items[1].content).toEqual('User');
    });

    it('formats the user message', () => {
      expect(pick(items[1], 'title', 'actions', 'display', 'loading')).toEqual({
        title: '',
        actions: {
          canCopy: true,
          canEdit: true,
          canGiveFeedback: false,
          canRegenerate: false,
        },
        display: {
          collapsed: false,
          hide: false,
        },
        loading: false,
      });
    });
  });

  describe('with function calling', () => {
    beforeEach(() => {
      mockChatService.hasRenderFunction.mockImplementation(() => false);
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        chatState: ChatState.Ready,
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
              content: 'Hello',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              function_call: {
                name: 'context',
                arguments: JSON.stringify({ queries: [], contexts: [] }),
                trigger: MessageRole.Assistant,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'context',
              content: JSON.stringify([]),
            },
          },
        ],
        onActionClick: jest.fn(),
      });
    });

    it('formats the function request', () => {
      expect(pick(items[2], 'actions', 'display', 'loading')).toEqual({
        actions: {
          canCopy: true,
          canEdit: true,
          canGiveFeedback: true,
          canRegenerate: true,
        },
        display: {
          collapsed: true,
          hide: false,
        },
        loading: false,
      });

      const { container } = render(items[2].title as React.ReactElement, {
        wrapper: ({ children }) => <Providers>{children}</Providers>,
      });

      expect(container.textContent).toBe('requested the function context');
    });

    it('formats the function response', () => {
      expect(pick(items[3], 'actions', 'display', 'loading')).toEqual({
        actions: {
          canCopy: true,
          canEdit: false,
          canGiveFeedback: false,
          canRegenerate: false,
        },
        display: {
          collapsed: true,
          hide: false,
        },
        loading: false,
      });

      const { container } = render(items[3].title as React.ReactElement, {
        wrapper: ({ children }) => <Providers>{children}</Providers>,
      });

      expect(container.textContent).toBe('executed the function context');
    });
  });
  describe('with a render function', () => {
    beforeEach(() => {
      mockChatService.hasRenderFunction.mockImplementation(() => true);
      mockChatService.renderFunction.mockImplementation(() => 'Rendered');
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        chatState: ChatState.Ready,
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
              content: 'Hello',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              function_call: {
                name: 'my_render_function',
                arguments: JSON.stringify({ foo: 'bar' }),
                trigger: MessageRole.Assistant,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'my_render_function',
              content: JSON.stringify([]),
            },
          },
        ],
        onActionClick: jest.fn(),
      });
    });

    it('renders a display element', () => {
      expect(mockChatService.hasRenderFunction).toHaveBeenCalledWith('my_render_function');

      expect(pick(items[3], 'actions', 'display')).toEqual({
        actions: {
          canCopy: true,
          canEdit: false,
          canGiveFeedback: false,
          canRegenerate: false,
        },
        display: {
          collapsed: false,
          hide: false,
        },
      });

      expect(items[3].element).toBeTruthy();

      const { container } = render(items[3].element as React.ReactElement, {
        wrapper: ({ children }) => <Providers>{children}</Providers>,
      });

      expect(mockChatService.renderFunction).toHaveBeenCalledWith(
        'my_render_function',
        JSON.stringify({ foo: 'bar' }),
        { content: '[]', name: 'my_render_function', role: 'user' },
        expect.any(Function)
      );

      expect(container.textContent).toEqual('Rendered');
    });
  });

  describe('with a function that errors out', () => {
    beforeEach(() => {
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        chatState: ChatState.Ready,
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
              content: 'Hello',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              function_call: {
                name: 'my_render_function',
                arguments: JSON.stringify({ foo: 'bar' }),
                trigger: MessageRole.Assistant,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'my_render_function',
              content: JSON.stringify({
                error: {
                  message: 'An error occurred',
                },
              }),
            },
          },
        ],
        onActionClick: jest.fn(),
      });
    });

    it('returns a title that reflects a failure to execute the function', () => {
      const { container } = render(items[3].title as React.ReactElement, {
        wrapper: ({ children }) => (
          <IntlProvider locale="en" messages={{}}>
            {children}
          </IntlProvider>
        ),
      });

      expect(container.textContent).toBe('failed to execute the function my_render_function');
    });

    it('formats the messages correctly', () => {
      expect(pick(items[3], 'actions', 'display', 'loading')).toEqual({
        actions: {
          canCopy: true,
          canEdit: false,
          canGiveFeedback: false,
          canRegenerate: false,
        },
        display: {
          collapsed: true,
          hide: false,
        },
        loading: false,
      });
    });
  });

  describe('with an invalid JSON response', () => {
    beforeEach(() => {
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        currentUser: {
          username: 'johndoe',
          full_name: 'John Doe',
        },
        chatState: ChatState.Ready,
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
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: 'my_function',
                arguments: JSON.stringify({}),
                trigger: MessageRole.User,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'invalid-json',
              name: 'my_function',
            },
          },
        ],
        onActionClick: jest.fn(),
      });
    });

    it('sets the invalid json as content', () => {
      expect(items[2].content).toBe(
        `\`\`\`
{
  "content": "invalid-json"
}
\`\`\``
      );
    });
  });

  describe('with function calling suggested by the user', () => {
    beforeEach(() => {
      mockChatService.hasRenderFunction.mockImplementation(() => false);
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        chatState: ChatState.Ready,
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
              role: MessageRole.Assistant,
              function_call: {
                name: 'context',
                arguments: JSON.stringify({ queries: [], contexts: [] }),
                trigger: MessageRole.User,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'context',
              content: JSON.stringify([]),
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: 'Reply from assistant',
            },
          },
        ],
        onActionClick: jest.fn(),
      });
    });

    it('formats the function request', () => {
      expect(pick(items[1], 'actions', 'display')).toEqual({
        actions: {
          canCopy: true,
          canRegenerate: false,
          canEdit: true,
          canGiveFeedback: false,
        },
        display: {
          collapsed: true,
          hide: false,
        },
      });
    });

    it('formats the assistant response', () => {
      expect(pick(items[3], 'actions', 'display')).toEqual({
        actions: {
          canCopy: true,
          canRegenerate: true,
          canEdit: false,
          canGiveFeedback: true,
        },
        display: {
          collapsed: false,
          hide: false,
        },
      });
    });
  });

  describe('while the chat is loading', () => {
    const renderWithLoading = (extraMessages: Message[]) => {
      items = getTimelineItemsfromConversation({
        chatService: mockChatService,
        hasConnector: true,
        chatState: ChatState.Loading,
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
              content: 'Test',
            },
          },
          ...extraMessages,
        ],
        onActionClick: jest.fn(),
      });
    };

    describe('with a user message last', () => {
      beforeEach(() => {
        renderWithLoading([]);
      });

      it('adds an assistant message which is loading', () => {
        expect(pick(last(items), 'display', 'actions', 'loading', 'role', 'content')).toEqual({
          loading: true,
          role: MessageRole.Assistant,
          actions: {
            canCopy: false,
            canRegenerate: false,
            canEdit: false,
            canGiveFeedback: false,
          },
          display: {
            collapsed: false,
            hide: false,
          },
          content: '',
        });
      });
    });

    describe('with a function request as the last message', () => {
      beforeEach(() => {
        renderWithLoading([
          {
            '@timestamp': new Date().toISOString(),
            message: {
              function_call: {
                name: 'my_function_call',
                trigger: MessageRole.Assistant,
              },
              role: MessageRole.Assistant,
            },
          },
        ]);
      });

      it('adds an assistant message which is loading', () => {
        expect(pick(last(items), 'display', 'actions', 'loading', 'role', 'content')).toEqual({
          loading: true,
          role: MessageRole.Assistant,
          actions: {
            canCopy: false,
            canRegenerate: false,
            canEdit: false,
            canGiveFeedback: false,
          },
          display: {
            collapsed: false,
            hide: false,
          },
          content: '',
        });
      });
    });
  });
});
