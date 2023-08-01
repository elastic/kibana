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
import { BehaviorSubject, Subject } from 'rxjs';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { MessageRole } from '../../common';
import { PendingMessage } from '../types';
import { useTimeline, UseTimelineResult } from './use_timeline';

type HookProps = Parameters<typeof useTimeline>[0];

describe('useTimeline', () => {
  let hookResult: RenderHookResult<HookProps, UseTimelineResult, Renderer<HookProps>>;

  describe('with an empty conversation', () => {
    beforeAll(() => {
      hookResult = renderHook((props) => useTimeline(props), {
        initialProps: {
          connectors: {},
          service: {},
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
          service: {
            chat: () => {},
          },
        } as unknown as HookProps,
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
    let subject: Subject<PendingMessage>;

    beforeEach(() => {
      hookResult = renderHook((nextProps) => useTimeline(nextProps), {
        initialProps: {
          initialConversation: {
            messages: [],
          },
          connectors: {
            selectedConnector: 'foo',
          },
          service: {
            chat: jest.fn().mockImplementation(() => {
              subject = new BehaviorSubject<PendingMessage>({
                message: {
                  role: MessageRole.Assistant,
                  content: '',
                },
              });
              return subject;
            }),
          },
        } as unknown as HookProps,
      });
    });

    describe("and it's loading", () => {
      it('adds two items of which the last one is loading', async () => {
        act(() => {
          hookResult.result.current.onSubmit({
            '@timestamp': new Date().toISOString(),
            message: { role: MessageRole.User, content: 'Hello' },
          });
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
          subject.next({ message: { role: MessageRole.Assistant, content: 'Goodbye' } });
        });

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: 'Goodbye',
          loading: true,
          canRegenerate: false,
          canGiveFeedback: false,
        });

        act(() => {
          subject.complete();
        });

        expect(hookResult.result.current.items[2]).toMatchObject({
          role: MessageRole.Assistant,
          content: 'Goodbye',
          loading: false,
          canRegenerate: true,
          canGiveFeedback: true,
        });
      });

      describe('and it being aborted', () => {
        beforeEach(async () => {
          act(() => {
            hookResult.result.current.onSubmit({
              '@timestamp': new Date().toISOString(),
              message: { role: MessageRole.User, content: 'Hello' },
            });
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
            canEdit: false,
            canRegenerate: true,
            canGiveFeedback: false,
            content: 'My partial',
            id: expect.any(String),
            loading: false,
            title: '',
            role: MessageRole.Assistant,
            error: expect.any(AbortError),
          });
        });

        describe('and it being regenerated', () => {
          beforeEach(() => {
            act(() => {
              hookResult.result.current.onRegenerate(hookResult.result.current.items[2]);
              subject.next({ message: { role: MessageRole.Assistant, content: '' } });
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
                subject.next({ message: { role: MessageRole.Assistant, content: 'Regenerated' } });
                subject.complete();
              });

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
