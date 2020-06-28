/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useAsyncTask } from './use_async_task';

describe('useAsyncTask', () => {
  let task: jest.Mock;

  beforeEach(() => {
    task = jest.fn().mockResolvedValue('resolved value');
  });

  it('does not invoke task if start was not called', () => {
    renderHook(() => useAsyncTask(task));
    expect(task).not.toHaveBeenCalled();
  });

  it('invokes the task when start is called', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsyncTask(task));

    act(() => {
      result.current.start({});
    });
    await waitForNextUpdate();

    expect(task).toHaveBeenCalled();
  });

  it('invokes the task with a signal and start args', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsyncTask(task));

    act(() => {
      result.current.start({
        arg1: 'value1',
        arg2: 'value2',
      });
    });
    await waitForNextUpdate();

    expect(task).toHaveBeenCalledWith(expect.any(AbortController), {
      arg1: 'value1',
      arg2: 'value2',
    });
  });

  it('populates result with the resolved value of the task', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAsyncTask(task));

    act(() => {
      result.current.start({});
    });
    await waitForNextUpdate();

    expect(result.current.result).toEqual('resolved value');
    expect(result.current.error).toBeUndefined();
  });

  it('populates error if task rejects', async () => {
    task.mockRejectedValue(new Error('whoops'));
    const { result, waitForNextUpdate } = renderHook(() => useAsyncTask(task));

    act(() => {
      result.current.start({});
    });
    await waitForNextUpdate();

    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toEqual(new Error('whoops'));
  });

  it('populates the loading state while the task is pending', async () => {
    let resolve: () => void;
    task.mockImplementation(() => new Promise((_resolve) => (resolve = _resolve)));

    const { result, waitForNextUpdate } = renderHook(() => useAsyncTask(task));

    act(() => {
      result.current.start({});
    });

    expect(result.current.loading).toBe(true);

    act(() => resolve());
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
  });
});
