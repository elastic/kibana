/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, RenderHookResult } from '@testing-library/react-hooks';
import React, { ReactNode } from 'react';
import { CoreStart } from '../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';
import { delay } from '../utils/test_helpers';
import { FetcherResult, useFetcher } from './use_fetcher';

// Wrap the hook with a provider so it can useKibana
const KibanaReactContext = createKibanaReactContext({
  notifications: { toasts: { add: () => {}, danger: () => {} } },
} as unknown as Partial<CoreStart>);

interface WrapperProps {
  children?: ReactNode;
  callback: () => Promise<string>;
  args: string[];
}
function wrapper({ children }: WrapperProps) {
  return <KibanaReactContext.Provider>{children}</KibanaReactContext.Provider>;
}

describe('useFetcher', () => {
  describe('when resolving after 500ms', () => {
    let hook: RenderHookResult<
      WrapperProps,
      FetcherResult<string> & {
        refetch: () => void;
      }
    >;

    beforeEach(() => {
      jest.useFakeTimers();
      async function fn() {
        await delay(500);
        return 'response from hook';
      }
      hook = renderHook(() => useFetcher(() => fn(), []), { wrapper });
    });

    it('should have loading spinner initally', async () => {
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should still show loading spinner after 100ms', async () => {
      jest.advanceTimersByTime(100);

      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should show success after 1 second', async () => {
      jest.advanceTimersByTime(1000);
      await hook.waitForNextUpdate();

      expect(hook.result.current).toEqual({
        data: 'response from hook',
        error: undefined,
        refetch: expect.any(Function),
        status: 'success',
      });
    });
  });

  describe('when throwing after 500ms', () => {
    let hook: RenderHookResult<
      WrapperProps,
      FetcherResult<string> & {
        refetch: () => void;
      }
    >;

    beforeEach(() => {
      jest.useFakeTimers();
      async function fn(): Promise<string> {
        await delay(500);
        throw new Error('Something went wrong');
      }
      hook = renderHook(() => useFetcher(() => fn(), []), { wrapper });
    });

    it('should have loading spinner initally', async () => {
      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should still show loading spinner after 100ms', async () => {
      jest.advanceTimersByTime(100);

      expect(hook.result.current).toEqual({
        data: undefined,
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });
    });

    it('should show error after 1 second', async () => {
      jest.advanceTimersByTime(1000);
      await hook.waitForNextUpdate();

      expect(hook.result.current).toEqual({
        data: undefined,
        error: expect.any(Error),
        refetch: expect.any(Function),
        status: 'failure',
      });
    });
  });

  describe('when a hook already has data', () => {
    it('should show "first response" while loading "second response"', async () => {
      jest.useFakeTimers();

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

      await hook.waitForNextUpdate();

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

      jest.advanceTimersByTime(100);

      // assert: while loading new data the previous data should still be rendered
      expect(hook.result.current).toEqual({
        data: 'first response',
        error: undefined,
        refetch: expect.any(Function),
        status: 'loading',
      });

      jest.advanceTimersByTime(500);
      await hook.waitForNextUpdate();

      // assert: "second response" has loaded and should be rendered
      expect(hook.result.current).toEqual({
        data: 'second response',
        error: undefined,
        refetch: expect.any(Function),
        status: 'success',
      });
    });

    it('should return the same object reference when data is unchanged between rerenders', async () => {
      const hook = renderHook(
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
        ({ callback, args }) => useFetcher(callback, args),
        {
          initialProps: {
            callback: async () => 'data response',
            args: ['a'],
          },
          wrapper,
        }
      );
      await hook.waitForNextUpdate();
      const firstResult = hook.result.current;
      hook.rerender();
      const secondResult = hook.result.current;

      // assert: subsequent rerender returns the same object reference
      expect(secondResult === firstResult).toEqual(true);

      hook.rerender({
        callback: async () => {
          return 'second response';
        },
        args: ['b'],
      });
      await hook.waitForNextUpdate();
      const thirdResult = hook.result.current;

      // assert: rerender with different data returns a new object
      expect(secondResult === thirdResult).toEqual(false);
    });
  });
});
