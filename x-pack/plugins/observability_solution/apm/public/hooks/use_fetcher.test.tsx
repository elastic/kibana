/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act, renderHook, type RenderHookResult } from '@testing-library/react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { delay } from '../utils/test_helpers';
import { useFetcher, isPending, FETCH_STATUS } from './use_fetcher';

// Wrap the hook with a provider so it can useKibana
const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {}, danger: () => {} } },
} as unknown as Partial<CoreStart>);

function wrapper({ children }: React.PropsWithChildren) {
  return <KibanaReactContext.Provider>{children}</KibanaReactContext.Provider>;
}

describe('useFetcher', () => {
  describe('when resolving after 500ms', () => {
    let hook: RenderHookResult<ReturnType<typeof useFetcher>, Parameters<typeof useFetcher>>;

    beforeAll(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      // jest.useFakeTimers({ legacyFakeTimers: true });
      async function fn() {
        await delay(500);
        return 'response from hook';
      }
      hook = renderHook(() => useFetcher(() => fn(), []), { wrapper });
    });

    it('should have loading spinner initally', () => {
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should still show loading spinner after 100ms', () => {
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should show success after 1 second', async () => {
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => expect(hook.result.current.status).toBe('success'));

      expect(hook.result.current).toEqual({
        data: 'response from hook',
        error: undefined,
        refetch: expect.any(Function),
        status: 'success',
      });
    });
  });

  describe('when throwing after 500ms', () => {
    let hook: RenderHookResult<ReturnType<typeof useFetcher>, Parameters<typeof useFetcher>>;

    beforeAll(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(() => {
      // jest.useFakeTimers({ legacyFakeTimers: true });
      async function fn(): Promise<string> {
        await delay(500);
        throw new Error('Something went wrong');
      }
      hook = renderHook(() => useFetcher(() => fn(), []), { wrapper });
    });

    it('should have loading spinner initially', () => {
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should still show loading spinner after 100ms', () => {
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should show error after 1 second', async () => {
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => expect(hook.result.current.status).toBe('failure'));

      expect(hook.result.current).toEqual({
        data: undefined,
        error: expect.any(Error),
        refetch: expect.any(Function),
        status: 'failure',
      });
    });
  });

  describe('when a hook already has data', () => {
    beforeAll(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should show "first response" while loading "second response"', async () => {
      // jest.useFakeTimers({ legacyFakeTimers: true });

      const hook = renderHook(
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
        ({ callback, args }) => useFetcher(callback, args),
        {
          initialProps: {
            callback: async () => 'first response',
            args: ['a'],
          },
          wrapper,
        }
      );
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });

      await waitFor(() => expect(hook.result.current.status).toBe('success'));

      // assert: first response has loaded and should be rendered
      expect(hook.result.current).toEqual({
        data: 'first response',
        error: undefined,
        refetch: expect.any(Function),
        status: 'success',
      });

      // act: re-render hook with async callback
      hook.rerender({
        callback: async () => {
          await delay(500);
          return 'second response';
        },
        args: ['b'],
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => new Promise((resolve) => resolve(null)));

      // assert: while loading new data the previous data should still be rendered
      expect(hook.result.current).toEqual({
        data: 'first response',
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => expect(hook.result.current.status).toBe('success'));

      // assert: "second response" has loaded and should be rendered
      expect(hook.result.current).toEqual({
        data: 'second response',
        error: undefined,
        refetch: expect.any(Function),
        status: 'success',
      });
    });

    it('should return the same object reference when data is unchanged between rerenders', async () => {
      const initialProps = {
        callback: async () => 'data response',
        args: ['a'],
      };

      const hook = renderHook(
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
        ({ callback, args }) => useFetcher(callback, args),
        {
          initialProps,
          wrapper,
        }
      );

      await waitFor(() => expect(hook.result.current.status).toBe('success'));
      const firstResult = hook.result.current;
      hook.rerender(initialProps);
      const secondResult = hook.result.current;

      // assert: subsequent rerender returns the same object reference
      expect(secondResult === firstResult).toEqual(true);

      hook.rerender({
        callback: async () => {
          return 'second response';
        },
        args: ['b'],
      });
      await waitFor(() => new Promise((resolve) => resolve(null)));
      const thirdResult = hook.result.current;

      // assert: rerender with different data returns a new object
      expect(secondResult === thirdResult).toEqual(false);
    });
  });

  describe('isPending', () => {
    [FETCH_STATUS.NOT_INITIATED, FETCH_STATUS.LOADING].forEach((status) => {
      it(`returns true when ${status}`, () => {
        expect(isPending(status)).toBeTruthy();
      });
    });

    [FETCH_STATUS.FAILURE, FETCH_STATUS.SUCCESS].forEach((status) => {
      it(`returns false when ${status}`, () => {
        expect(isPending(status)).toBeFalsy();
      });
    });
  });
});
