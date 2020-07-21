/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useAsync } from './use_async';

interface TestArgs {
  n: number;
  s: string;
}

type TestReturn = Promise<unknown>;

describe('useAsync', () => {
  let fn: jest.Mock<TestReturn, TestArgs[]>;
  let args: TestArgs;

  beforeEach(() => {
    args = { n: 1, s: 's' };
    fn = jest.fn().mockResolvedValue(false);
  });

  it('does not invoke fn if start was not called', () => {
    renderHook(() => useAsync(fn));
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes the function when start is called', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

    act(() => {
      result.current.start(args);
    });
    await waitForNextUpdate();

    expect(fn).toHaveBeenCalled();
  });

  it('invokes the function with start args', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));
    const expectedArgs = { ...args };

    act(() => {
      result.current.start(args);
    });
    await waitForNextUpdate();

    expect(fn).toHaveBeenCalledWith(expectedArgs);
  });

  it('populates result with the resolved value of the fn', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));
    fn.mockResolvedValue({ resolved: 'value' });

    act(() => {
      result.current.start(args);
    });
    await waitForNextUpdate();

    expect(result.current.result).toEqual({ resolved: 'value' });
    expect(result.current.error).toBeUndefined();
  });

  it('populates error if function rejects', async () => {
    fn.mockRejectedValue(new Error('whoops'));
    const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

    act(() => {
      result.current.start(args);
    });
    await waitForNextUpdate();

    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toEqual(new Error('whoops'));
  });

  it('populates the loading state while the function is pending', async () => {
    let resolve: () => void;
    fn.mockImplementation(() => new Promise((_resolve) => (resolve = _resolve)));

    const { result, waitForNextUpdate } = renderHook(() => useAsync(fn));

    act(() => {
      result.current.start(args);
    });

    expect(result.current.loading).toBe(true);

    act(() => resolve());
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
  });
});
