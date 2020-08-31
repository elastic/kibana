/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  renderHook,
  act,
  RenderHookResult,
} from '@testing-library/react-hooks';
import { useDelayedVisibility } from '.';

// Failing: See https://github.com/elastic/kibana/issues/66389
describe.skip('useFetcher', () => {
  let hook: RenderHookResult<any, any>;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('is initially false', () => {
    hook = renderHook((isLoading) => useDelayedVisibility(isLoading), {
      initialProps: false,
    });
    expect(hook.result.current).toEqual(false);
  });

  it('does not change to true immediately', () => {
    hook = renderHook((isLoading) => useDelayedVisibility(isLoading), {
      initialProps: false,
    });

    hook.rerender(true);
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(hook.result.current).toEqual(false);
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(hook.result.current).toEqual(true);
  });

  it('does not change to false immediately', () => {
    hook = renderHook((isLoading) => useDelayedVisibility(isLoading), {
      initialProps: false,
    });

    hook.rerender(true);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    hook.rerender(false);

    expect(hook.result.current).toEqual(true);
  });

  // Disabled because it's flaky: https://github.com/elastic/kibana/issues/66389
  // it('is true for minimum 1000ms', () => {
  //   hook = renderHook((isLoading) => useDelayedVisibility(isLoading), {
  //     initialProps: false,
  //   });

  //   hook.rerender(true);

  //   act(() => {
  //     jest.advanceTimersByTime(100);
  //   });

  //   hook.rerender(false);
  //   act(() => {
  //     jest.advanceTimersByTime(900);
  //   });

  //   expect(hook.result.current).toEqual(true);

  //   act(() => {
  //     jest.advanceTimersByTime(100);
  //   });

  //   expect(hook.result.current).toEqual(false);
  // });
});
