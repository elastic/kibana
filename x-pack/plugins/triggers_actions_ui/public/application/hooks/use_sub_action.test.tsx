/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../common/lib/kibana';
import { useSubAction } from './use_sub_action';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useSubAction', () => {
  const params = {
    connectorId: 'test-id',
    subAction: 'test',
    subActionParams: {},
  };
  useKibanaMock().services.http.post = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ status: 'ok', data: {} }));
  let abortSpy = jest.spyOn(window, 'AbortController');

  beforeEach(() => {
    jest.clearAllMocks();
    abortSpy.mockRestore();
  });

  it('init', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(result.current).toEqual({
      isLoading: false,
      response: {},
      error: null,
    });
  });

  it('executes the sub action correctly', async () => {
    const { waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      '/api/actions/connector/test-id/_execute',
      {
        body: '{"params":{"subAction":"test","subActionParams":{}}}',
        signal: new AbortController().signal,
      }
    );
  });

  it('executes sub action if subAction parameter changes', async () => {
    const { rerender, waitForNextUpdate } = renderHook(useSubAction, { initialProps: params });
    await waitForNextUpdate();

    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ ...params, subAction: 'test-2' });
      await waitForNextUpdate();
    });

    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(2);
  });

  it('executes sub action if connectorId parameter changes', async () => {
    const { rerender, waitForNextUpdate } = renderHook(useSubAction, { initialProps: params });
    await waitForNextUpdate();

    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ ...params, connectorId: 'test-id-2' });
      await waitForNextUpdate();
    });

    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(2);
  });

  it('returns memoized response if subActionParams changes but values are equal', async () => {
    const { result, rerender, waitForNextUpdate } = renderHook(useSubAction, {
      initialProps: { ...params, subActionParams: { foo: 'bar' } },
    });
    await waitForNextUpdate();

    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(1);
    const previous = result.current;

    await act(async () => {
      rerender({ ...params, subActionParams: { foo: 'bar' } });
      await waitForNextUpdate();
    });

    expect(result.current.response).toBe(previous.response);
    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(1);
  });

  it('executes sub action if subActionParams changes and values are not equal', async () => {
    const { result, rerender, waitForNextUpdate } = renderHook(useSubAction, {
      initialProps: { ...params, subActionParams: { foo: 'bar' } },
    });
    await waitForNextUpdate();

    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(1);
    const previous = result.current;

    await act(async () => {
      rerender({ ...params, subActionParams: { foo: 'baz' } });
      await waitForNextUpdate();
    });

    expect(result.current.response).not.toBe(previous.response);
    expect(useKibanaMock().services.http.post).toHaveBeenCalledTimes(2);
  });

  it('returns an error correctly', async () => {
    const error = new Error('error executing');
    useKibanaMock().services.http.post = jest.fn().mockRejectedValueOnce(error);

    const { result, waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(result.current).toEqual({
      isLoading: false,
      response: undefined,
      error,
    });
  });

  it('should not set error if aborted', async () => {
    const firstAbortCtrl = new AbortController();
    firstAbortCtrl.abort();
    abortSpy = jest.spyOn(window, 'AbortController').mockReturnValueOnce(firstAbortCtrl);

    const error = new Error('error executing');
    useKibanaMock().services.http.post = jest.fn().mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSubAction(params));

    expect(result.current.error).toBe(null);
  });

  it('should abort on unmount', async () => {
    const firstAbortCtrl = new AbortController();
    abortSpy = jest.spyOn(window, 'AbortController').mockReturnValueOnce(firstAbortCtrl);

    const { unmount } = renderHook(useSubAction, { initialProps: params });

    unmount();

    expect(firstAbortCtrl.signal.aborted).toEqual(true);
  });

  it('should abort on parameter change', async () => {
    const firstAbortCtrl = new AbortController();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => {
      abortSpy.mockRestore();
      return firstAbortCtrl;
    });

    const { rerender } = renderHook(useSubAction, { initialProps: params });

    await act(async () => {
      rerender({ ...params, connectorId: 'test-id-2' });
    });

    expect(firstAbortCtrl.signal.aborted).toEqual(true);
  });

  it('does not execute if disabled', async () => {
    const { result } = renderHook(() => useSubAction({ ...params, disabled: true }));

    expect(useKibanaMock().services.http.post).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isLoading: false,
      response: undefined,
      error: null,
    });
  });
});
