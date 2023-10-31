/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import {
  act,
  renderHook,
  type Renderer,
  type RenderHookResult,
} from '@testing-library/react-hooks';
import { BehaviorSubject, Subject } from 'rxjs';
import { MessageRole } from '../../common';
import { ChatTimelineItem } from '../components/chat/chat_timeline';
import type { PendingMessage } from '../types';
import { useTimeline, UseTimelineResult } from './use_timeline';

type HookProps = Parameters<typeof useTimeline>[0];

const WAIT_OPTIONS = { timeout: 1500 };

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
    },
  }),
}));

describe('useTimeline', () => {
  let hookResult: RenderHookResult<HookProps, UseTimelineResult, Renderer<HookProps>>;

  describe('with an empty conversation', () => {
    beforeAll(() => {
      hookResult = renderHook((props) => useTimeline(props), {
        initialProps: {
          connectors: {
            loading: false,
            selectedConnector: 'OpenAI',
            selectConnector: () => {},
            connectors: [{ id: 'OpenAI' }] as FindActionResult[],
          },
          chatService: {},
          messages: [],
          onChatComplete: jest.fn(),
          onChatUpdate: jest.fn(),
        } as unknown as HookProps,
      });
    });
    it('renders the correct timeline items', () => {
      expect(hookResult.result.current.items.length).toEqual(1);

      expect(hookResult.result.current.items[0]).toEqual({
        display: {
          collapsed: false,
          hide: false,
        },
        actions: {
          canCopy: false,
          canEdit: false,
          canRegenerate: false,
          canGiveFeedback: false,
        },
        role: MessageRole.User,
        title: 'started a conversation',
        loading: false,
        id: expect.any(String),
      });
    });
  });

  describe('with an existing conversation', () => {
    beforeAll(() => {
      hookResult = renderHook((props) => useTimeline(props), {
        initialProps: {
          messages: [
            {
              message: {
                role: MessageRole.System,
                content: 'You are a helpful assistant for Elastic Observability',
              },
            },
            {
              message: {
                role: MessageRole.User,
                content: 'hello',
              },
            },
            {
              message: {
                role: MessageRole.Assistant,
                content: '',
                function_call: {
                  name: 'recall',
                  trigger: MessageRole.User,
                },
              },
            },
            {
              message: {
                name: 'recall',
                role: MessageRole.User,
                content: '',
              },
            },
            {
              message: {
                content: 'goodbye',
                function_call: {
                  name: '',
                  arguments: '',
                  trigger: MessageRole.Assistant,
                },
                role: MessageRole.Assistant,
              },
            },
          ],
          connectors: {
            selectedConnector: 'foo',
          },
          chatService: {
            chat: () => {},
            hasRenderFunction: () => {},
            hasFunction: () => {},
          },
        } as unknown as HookProps,
      });
    });
    it('renders the correct timeline items', () => {
      expect(hookResult.result.current.items.length).toEqual(4);

      expect(hookResult.result.current.items[1]).toEqual({
        actions: { canCopy: true, canEdit: true, canGiveFeedback: false, canRegenerate: false },
        content: 'hello',
        currentUser: undefined,
        display: { collapsed: false, hide: false },
        element: undefined,
        function_call: undefined,
        id: expect.any(String),
        loading: false,
        role: MessageRole.User,
        title: '',
      });

      expect(hookResult.result.current.items[3]).toEqual({
        actions: { canCopy: true, canEdit: false, canGiveFeedback: false, canRegenerate: true },
        content: 'goodbye',
        currentUser: undefined,
        display: { collapsed: false, hide: false },
        element: undefined,
        function_call: {
          arguments: '',
          name: '',
          trigger: MessageRole.Assistant,
        },
        id: expect.any(String),
        loading: false,
        role: MessageRole.Assistant,
        title: '',
      });

      // Items that are function calls are collapsed into an array.

      // 'title' is a <FormattedMessage /> component. This throws Jest for a loop.
      const collapsedItemsWithoutTitle = (
        hookResult.result.current.items[2] as ChatTimelineItem[]
      ).map(({ title, ...rest }) => rest);

      expect(collapsedItemsWithoutTitle).toEqual([
        {
          display: {
            collapsed: true,
            hide: false,
          },
          actions: {
            canCopy: true,
            canEdit: true,
            canRegenerate: false,
            canGiveFeedback: false,
          },
          currentUser: undefined,
          function_call: {
            name: 'recall',
            trigger: MessageRole.User,
          },
          role: MessageRole.User,
          content: `\`\`\`
{
  \"name\": \"recall\"
}
\`\`\``,
          loading: false,
          id: expect.any(String),
        },
        {
          display: {
            collapsed: true,
            hide: false,
          },
          actions: {
            canCopy: true,
            canEdit: false,
            canRegenerate: false,
            canGiveFeedback: false,
          },
          currentUser: undefined,
          function_call: undefined,
          role: MessageRole.User,
          content: `\`\`\`
{}
\`\`\``,
          loading: false,
          id: expect.any(String),
        },
      ]);
    });
  });

  describe('when submitting a new prompt', () => {
    let subject: Subject<PendingMessage>;

    let props: Omit<HookProps, 'onChatUpdate' | 'onChatComplete' | 'chatService'> & {
      onChatUpdate: jest.MockedFn<HookProps['onChatUpdate']>;
      onChatComplete: jest.MockedFn<HookProps['onChatComplete']>;
      chatService: Omit<HookProps['chatService'], 'executeFunction'> & {
        executeFunction: jest.MockedFn<HookProps['chatService']['executeFunction']>;
      };
    };

    beforeEach(() => {
      props = {
        messages: [],
        connectors: {
          selectedConnector: 'foo',
        },
        chatService: {
          chat: jest.fn().mockImplementation(() => {
            subject = new BehaviorSubject<PendingMessage>({
              message: {
                role: MessageRole.Assistant,
                content: '',
              },
            });
            return subject;
          }),
          executeFunction: jest.fn(),
          hasFunction: jest.fn(),
          hasRenderFunction: jest.fn(),
        },
        onChatUpdate: jest.fn().mockImplementation((messages) => {
          props = { ...props, messages };
          hookResult.rerender(props as unknown as HookProps);
        }),
        onChatComplete: jest.fn(),
      } as any;

      hookResult = renderHook((nextProps) => useTimeline(nextProps), {
        initialProps: props as unknown as HookProps,
      });
    });

    describe("and it's loading", () => {
      beforeEach(() => {
        act(() => {
          hookResult.result.current.onSubmit({
            '@timestamp': new Date().toISOString(),
            message: { role: MessageRole.User, content: 'Hello' },
          });
        });
      });

      it('adds two items of which the last one is loading', async () => {
        expect((hookResult.result.current.items[0] as ChatTimelineItem).role).toEqual(
          MessageRole.User
        );
        expect((hookResult.result.current.items[1] as ChatTimelineItem).role).toEqual(
          MessageRole.User
        );

        expect((hookResult.result.current.items[2] as ChatTimelineItem).role).toEqual(
          MessageRole.Assistant
        );

        expect(hookResult.result.current.items[1]).toMatchObject({
          role: MessageRole.User,
          content: 'Hello',
          loading: false,
        });

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: '',
          loading: true,
          actions: {
            canRegenerate: false,
            canGiveFeedback: false,
          },
        });

        expect(hookResult.result.current.items.length).toBe(3);

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: '',
          loading: true,
          actions: {
            canRegenerate: false,
            canGiveFeedback: false,
          },
        });
      });

      describe('and it pushes the next part', () => {
        beforeEach(() => {
          act(() => {
            subject.next({ message: { role: MessageRole.Assistant, content: 'Goodbye' } });
          });
        });

        it('adds the partial response', () => {
          expect(hookResult.result.current.items[2]).toMatchObject({
            role: MessageRole.Assistant,
            content: 'Goodbye',
            loading: true,
            actions: {
              canRegenerate: false,
              canGiveFeedback: false,
            },
          });
        });

        describe('and it completes', () => {
          beforeEach(async () => {
            act(() => {
              subject.complete();
            });

            await hookResult.waitForNextUpdate(WAIT_OPTIONS);
          });

          it('adds the completed message', () => {
            expect(hookResult.result.current.items[2]).toMatchObject({
              role: MessageRole.Assistant,
              content: 'Goodbye',
              loading: false,
              actions: {
                canRegenerate: true,
                canGiveFeedback: false,
              },
            });
          });

          describe('and the user edits a message', () => {
            beforeEach(() => {
              act(() => {
                hookResult.result.current.onEdit(
                  hookResult.result.current.items[1] as ChatTimelineItem,
                  {
                    '@timestamp': new Date().toISOString(),
                    message: { content: 'Edited message', role: MessageRole.User },
                  }
                );
                subject.next({ message: { role: MessageRole.Assistant, content: '' } });
                subject.complete();
              });
            });

            it('calls onChatUpdate with the edited message', () => {
              expect(hookResult.result.current.items.length).toEqual(4);
              expect((hookResult.result.current.items[2] as ChatTimelineItem).content).toEqual(
                'Edited message'
              );
              expect((hookResult.result.current.items[3] as ChatTimelineItem).content).toEqual('');
            });
          });
        });
      });

      describe('and it is being aborted', () => {
        beforeEach(() => {
          act(() => {
            subject.next({ message: { role: MessageRole.Assistant, content: 'My partial' } });
            subject.next({
              message: {
                role: MessageRole.Assistant,
                content: 'My partial',
              },
              aborted: true,
              error: new AbortError(),
            });
            subject.complete();
          });
        });

        it('adds the partial response', async () => {
          expect(hookResult.result.current.items.length).toBe(3);

          expect(hookResult.result.current.items[2]).toEqual({
            actions: {
              canEdit: false,
              canRegenerate: true,
              canGiveFeedback: false,
              canCopy: true,
            },
            display: {
              collapsed: false,
              hide: false,
            },
            content: 'My partial',
            id: expect.any(String),
            loading: false,
            title: '',
            role: MessageRole.Assistant,
            error: expect.any(AbortError),
          });
        });

        describe('and it is being regenerated', () => {
          beforeEach(() => {
            act(() => {
              hookResult.result.current.onRegenerate(
                hookResult.result.current.items[2] as ChatTimelineItem
              );
              subject.next({ message: { role: MessageRole.Assistant, content: '' } });
            });
          });

          it('updates the last item in the array to be loading', () => {
            expect(hookResult.result.current.items.length).toEqual(3);

            expect(hookResult.result.current.items[2]).toEqual({
              display: {
                hide: false,
                collapsed: false,
              },
              actions: {
                canCopy: true,
                canEdit: false,
                canRegenerate: false,
                canGiveFeedback: false,
              },
              content: '',
              id: expect.any(String),
              loading: true,
              title: '',
              role: MessageRole.Assistant,
            });
          });

          describe('and it is regenerated again', () => {
            beforeEach(async () => {
              act(() => {
                hookResult.result.current.onStopGenerating();
              });

              act(() => {
                hookResult.result.current.onRegenerate(
                  hookResult.result.current.items[2] as ChatTimelineItem
                );
              });
            });

            it('updates the last item to be not loading again', async () => {
              expect(hookResult.result.current.items.length).toBe(3);

              expect(hookResult.result.current.items[2]).toEqual({
                actions: {
                  canCopy: true,
                  canEdit: false,
                  canRegenerate: false,
                  canGiveFeedback: false,
                },
                display: {
                  collapsed: false,
                  hide: false,
                },
                content: '',
                id: expect.any(String),
                loading: true,
                title: '',
                role: MessageRole.Assistant,
              });

              act(() => {
                subject.next({ message: { role: MessageRole.Assistant, content: 'Regenerated' } });
                subject.complete();
              });

              await hookResult.waitForNextUpdate(WAIT_OPTIONS);

              expect(hookResult.result.current.items.length).toBe(3);

              expect(hookResult.result.current.items[2]).toEqual({
                display: {
                  collapsed: false,
                  hide: false,
                },
                actions: {
                  canCopy: true,
                  canEdit: false,
                  canRegenerate: true,
                  canGiveFeedback: false,
                },
                content: 'Regenerated',
                currentUser: undefined,
                function_call: undefined,
                id: expect.any(String),
                element: undefined,
                loading: false,
                title: '',
                role: MessageRole.Assistant,
              });
            });
          });
        });
      });

      describe('and a function call is returned', () => {
        it('the function call is executed and its response is sent as a user reply', async () => {
          jest.clearAllMocks();

          act(() => {
            subject.next({
              message: {
                role: MessageRole.Assistant,
                function_call: {
                  trigger: MessageRole.Assistant,
                  name: 'my_function',
                  arguments: '{}',
                },
              },
            });
            subject.complete();
          });

          props.chatService.executeFunction.mockResolvedValueOnce({
            content: {
              message: 'my-response',
            },
          });

          await hookResult.waitForNextUpdate(WAIT_OPTIONS);

          expect(props.onChatUpdate).toHaveBeenCalledTimes(2);

          expect(
            props.onChatUpdate.mock.calls[0][0].map(
              (msg) => msg.message.content || msg.message.function_call?.name
            )
          ).toEqual(['Hello', 'my_function']);

          expect(
            props.onChatUpdate.mock.calls[1][0].map(
              (msg) => msg.message.content || msg.message.function_call?.name
            )
          ).toEqual(['Hello', 'my_function', JSON.stringify({ message: 'my-response' })]);

          expect(props.onChatComplete).not.toHaveBeenCalled();

          expect(props.chatService.executeFunction).toHaveBeenCalledWith({
            name: 'my_function',
            args: '{}',
            connectorId: 'foo',
            messages: [
              {
                '@timestamp': expect.any(String),
                message: {
                  content: 'Hello',
                  role: MessageRole.User,
                },
              },
            ],
            signal: expect.any(Object),
          });

          act(() => {
            subject.next({
              message: {
                role: MessageRole.Assistant,
                content: 'looks like my-function returned my-response',
              },
            });
            subject.complete();
          });

          await hookResult.waitForNextUpdate(WAIT_OPTIONS);

          expect(props.onChatComplete).toHaveBeenCalledTimes(1);

          expect(
            props.onChatComplete.mock.calls[0][0].map(
              (msg) => msg.message.content || msg.message.function_call?.name
            )
          ).toEqual([
            'Hello',
            'my_function',
            JSON.stringify({ message: 'my-response' }),
            'looks like my-function returned my-response',
          ]);
        });
      });
    });
  });
});
