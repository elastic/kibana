/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  act,
  renderHook,
  type Renderer,
  type RenderHookResult,
} from '@testing-library/react-hooks';
import { merge } from 'lodash';
import { DeepPartial } from 'utility-types';
import { MessageRole } from '../../common';
import { createNewConversation, useTimeline, UseTimelineResult } from './use_timeline';

type HookProps = Parameters<typeof useTimeline>[0];

const WAIT_OPTIONS = { timeout: 5000 };

describe('useTimeline', () => {
  let hookResult: RenderHookResult<HookProps, UseTimelineResult, Renderer<HookProps>>;

  describe('with an empty conversation', () => {
    beforeAll(() => {
      hookResult = renderHook((props) => useTimeline(props), {
        initialProps: {
          connectors: {},
          chat: {},
        } as HookProps,
      });
    });
    it('renders the correct timeline items', () => {
      expect(hookResult.result.current.items.length).toEqual(1);

      expect(hookResult.result.current.items[0]).toEqual({
        canEdit: false,
        canRegenerate: false,
        canGiveFeedback: false,
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
          initialConversation: {
            messages: [
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
          connectors: {
            selectedConnector: 'foo',
          },
          chat: {},
        } as HookProps,
      });
    });
    it('renders the correct timeline items', () => {
      expect(hookResult.result.current.items.length).toEqual(3);

      expect(hookResult.result.current.items[1]).toEqual({
        canEdit: true,
        canRegenerate: false,
        canGiveFeedback: false,
        role: MessageRole.User,
        content: 'Hello',
        loading: false,
        id: expect.any(String),
        title: '',
      });

      expect(hookResult.result.current.items[2]).toEqual({
        canEdit: false,
        canRegenerate: true,
        canGiveFeedback: true,
        role: MessageRole.Assistant,
        content: 'Goodbye',
        loading: false,
        id: expect.any(String),
        title: '',
      });
    });
  });

  describe('when submitting a new prompt', () => {
    const createChatSimulator = (initialProps?: DeepPartial<HookProps>) => {
      let resolve: (data: { content?: string; aborted?: boolean }) => void;

      const abort = () => {
        resolve({
          content: props.chat.content,
          aborted: true,
        });
        rerender({
          chat: {
            loading: false,
          },
        });
      };

      let props = merge(
        {
          initialConversation: createNewConversation(),
          connectors: {
            selectedConnector: 'myConnector',
          },
          chat: {
            loading: true,
            content: undefined,
            abort,
            generate: () => {
              const promise = new Promise((innerResolve) => {
                resolve = (...args) => {
                  innerResolve(...args);
                };
              });

              rerender({
                chat: {
                  content: '',
                  loading: true,
                  error: undefined,
                  function_call: undefined,
                },
              });
              return promise;
            },
          },
        } as unknown as HookProps,
        {
          ...initialProps,
        }
      );

      hookResult = renderHook((nextProps) => useTimeline(nextProps), {
        initialProps: props,
      });

      function rerender(nextProps: DeepPartial<HookProps>) {
        props = merge({}, props, nextProps) as HookProps;
        hookResult.rerender(props);
      }

      return {
        next: (nextValue: { content?: string }) => {
          rerender({
            chat: {
              content: nextValue.content,
            },
          });
        },
        complete: () => {
          resolve({
            content: props.chat.content,
          });
          rerender({
            chat: {
              loading: false,
            },
          });
        },
        abort,
      };
    };

    describe("and it's loading", () => {
      it('adds two items of which the last one is loading', async () => {
        const simulator = createChatSimulator();

        act(() => {
          hookResult.result.current.onSubmit({ content: 'Hello' });
        });

        expect(hookResult.result.current.items[0].role).toEqual(MessageRole.User);
        expect(hookResult.result.current.items[1].role).toEqual(MessageRole.User);

        expect(hookResult.result.current.items[2].role).toEqual(MessageRole.Assistant);

        expect(hookResult.result.current.items[1]).toMatchObject({
          role: MessageRole.User,
          content: 'Hello',
          loading: false,
        });

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: '',
          loading: true,
          canRegenerate: false,
          canGiveFeedback: false,
        });

        expect(hookResult.result.current.items.length).toBe(3);

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: '',
          loading: true,
          canRegenerate: false,
          canGiveFeedback: false,
        });

        act(() => {
          simulator.next({ content: 'Goodbye' });
        });

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: 'Goodbye',
          loading: true,
          canRegenerate: false,
          canGiveFeedback: false,
        });

        act(() => {
          simulator.complete();
        });

        await hookResult.waitForNextUpdate(WAIT_OPTIONS);

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: 'Goodbye',
          loading: false,
          canRegenerate: true,
          canGiveFeedback: true,
        });
      });

      describe('and it being aborted', () => {
        let simulator: ReturnType<typeof createChatSimulator>;

        beforeEach(async () => {
          simulator = createChatSimulator();

          act(() => {
            hookResult.result.current.onSubmit({ content: 'Hello' });
            simulator.next({ content: 'My partial' });
            simulator.abort();
          });

          await hookResult.waitForNextUpdate(WAIT_OPTIONS);
        });

        it('adds the partial response', async () => {
          expect(hookResult.result.current.items.length).toBe(3);

          expect(hookResult.result.current.items[2]).toEqual({
            canEdit: false,
            canRegenerate: true,
            canGiveFeedback: true,
            content: 'My partial',
            id: expect.any(String),
            loading: false,
            title: '',
            role: MessageRole.Assistant,
          });
        });

        describe('and it being regenerated', () => {
          beforeEach(() => {
            act(() => {
              hookResult.result.current.onRegenerate(hookResult.result.current.items[2]);
            });
          });

          it('updates the last item in the array to be loading', () => {
            expect(hookResult.result.current.items[2]).toEqual({
              canEdit: false,
              canRegenerate: false,
              canGiveFeedback: false,
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

              await hookResult.waitForNextUpdate(WAIT_OPTIONS);

              act(() => {
                hookResult.result.current.onRegenerate(hookResult.result.current.items[2]);
              });
            });

            it('updates the last item to be not loading again', async () => {
              expect(hookResult.result.current.items.length).toBe(3);

              expect(hookResult.result.current.items[2]).toEqual({
                canEdit: false,
                canRegenerate: false,
                canGiveFeedback: false,
                content: '',
                id: expect.any(String),
                loading: true,
                title: '',
                role: MessageRole.Assistant,
              });

              act(() => {
                simulator.next({ content: 'Regenerated' });
                simulator.complete();
              });

              await hookResult.waitForNextUpdate(WAIT_OPTIONS);

              expect(hookResult.result.current.items.length).toBe(3);

              expect(hookResult.result.current.items[2]).toEqual({
                canEdit: false,
                canRegenerate: true,
                canGiveFeedback: true,
                content: 'Regenerated',
                id: expect.any(String),
                loading: false,
                title: '',
                role: MessageRole.Assistant,
              });
            });
          });
        });
      });
    });
  });
});
