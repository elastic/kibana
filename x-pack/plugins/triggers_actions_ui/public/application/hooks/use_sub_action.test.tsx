/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useSubAction, UseSubActionParams } from './use_sub_action';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useSubAction', () => {
  const params: UseSubActionParams<unknown> = {
    connectorId: 'test-id',
    subAction: 'test',
    subActionParams: { foo: 'bar' },
  };
  const mockHttpPost = (useKibanaMock().services.http.post = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ status: 'ok', data: {} })));
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

    expect(mockHttpPost).toHaveBeenCalledWith('/api/actions/connector/test-id/_execute', {
      body: '{"params":{"subAction":"test","subActionParams":{"foo":"bar"}}}',
      signal: new AbortController().signal,
    });
  });

  it('executes sub action if subAction parameter changes', async () => {
    const { rerender, waitForNextUpdate } = renderHook(useSubAction, { initialProps: params });
    await waitForNextUpdate();

    expect(mockHttpPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ ...params, subAction: 'test-2' });
      await waitForNextUpdate();
    });

    expect(mockHttpPost).toHaveBeenCalledTimes(2);
  });

  it('executes sub action if connectorId parameter changes', async () => {
    const { rerender, waitForNextUpdate } = renderHook(useSubAction, { initialProps: params });
    await waitForNextUpdate();

    expect(mockHttpPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ ...params, connectorId: 'test-id-2' });
      await waitForNextUpdate();
    });

    expect(mockHttpPost).toHaveBeenCalledTimes(2);
  });

  it('returns memoized response if subActionParams changes but values are equal', async () => {
    const { result, rerender, waitForNextUpdate } = renderHook(useSubAction, {
      initialProps: { ...params, subActionParams: { foo: 'bar' } },
    });
    await waitForNextUpdate();

    expect(mockHttpPost).toHaveBeenCalledTimes(1);
    const previous = result.current;

    await act(async () => {
      rerender({ ...params, subActionParams: { foo: 'bar' } });
      await waitForNextUpdate();
    });

    expect(result.current.response).toBe(previous.response);
    expect(mockHttpPost).toHaveBeenCalledTimes(1);
  });

  it('executes sub action if subActionParams changes and values are not equal', async () => {
    const { result, rerender, waitForNextUpdate } = renderHook(useSubAction, {
      initialProps: { ...params, subActionParams: { foo: 'bar' } },
    });
    await waitForNextUpdate();

    expect(mockHttpPost).toHaveBeenCalledTimes(1);
    const previous = result.current;

    await act(async () => {
      rerender({ ...params, subActionParams: { foo: 'baz' } });
      await waitForNextUpdate();
    });

    expect(result.current.response).not.toBe(previous.response);
    expect(mockHttpPost).toHaveBeenCalledTimes(2);
  });

  it('returns an error correctly', async () => {
    const error = new Error('error executing');
    mockHttpPost.mockRejectedValueOnce(error);

    const { result, waitForNextUpdate } = renderHook(() => useSubAction(params));
    await waitForNextUpdate();

    expect(result.current).toEqual({
      isLoading: false,
      response: undefined,
      error,
    });
  });

  it('should abort on unmount', async () => {
    const firstAbortCtrl = new AbortController();
    abortSpy = jest.spyOn(window, 'AbortController').mockReturnValueOnce(firstAbortCtrl);

    const { unmount, result } = renderHook(useSubAction, { initialProps: params });

    unmount();

    expect(result.current.error).toEqual(null);
    expect(firstAbortCtrl.signal.aborted).toEqual(true);
  });

  it('should abort on disabled change', async () => {
    const firstAbortCtrl = new AbortController();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => {
      abortSpy.mockRestore();
      return firstAbortCtrl;
    });
    mockHttpPost.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ status: 'ok', data: {} }), 0))
    );

    const { result, rerender } = renderHook(useSubAction, {
      initialProps: params,
    });
    expect(result.current.isLoading).toEqual(true);

    rerender({ ...params, disabled: true });

    expect(result.current.isLoading).toEqual(false);
    expect(result.current.error).toEqual(null);
    expect(firstAbortCtrl.signal.aborted).toEqual(true);
  });

  it('should abort on parameter change', async () => {
    const firstAbortCtrl = new AbortController();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => {
      abortSpy.mockRestore();
      return firstAbortCtrl;
    });
    mockHttpPost.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ status: 'ok', data: {} }), 1))
    );
    const { result, rerender } = renderHook(useSubAction, {
      initialProps: params,
    });

    expect(result.current.isLoading).toEqual(true);
    expect(result.current.error).toEqual(null);

    mockHttpPost.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ status: 'ok', data: {} }), 1))
    );
    rerender({ ...params, connectorId: 'test-id-2' });

    expect(result.current.isLoading).toEqual(true);
    expect(result.current.error).toEqual(null);
    expect(firstAbortCtrl.signal.aborted).toEqual(true);
  });

  it('does not execute if disabled', async () => {
    const { result } = renderHook(() => useSubAction({ ...params, disabled: true }));

    expect(mockHttpPost).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isLoading: false,
      response: undefined,
      error: null,
    });
  });
});
