/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { RequestName } from './request_names';
import type { OptionsParam, RequestFnParam, Result } from './use_fetch';
import { useFetch } from './use_fetch';

export const mockEndTracking = jest.fn();
export const mockStartTracking = jest.fn(() => ({ endTracking: mockEndTracking }));
jest.mock('../../lib/apm/use_track_http_request', () => ({
  useTrackHttpRequest: jest.fn(() => ({
    startTracking: mockStartTracking,
  })),
}));

const requestName = 'test name' as RequestName;

const parameters = {
  some: 'fakeParam',
};
type Parameters = typeof parameters;

const response = 'someData';
const mockFetchFn = jest.fn(async (_: Parameters) => response);

type UseFetchParams = [RequestName, RequestFnParam<Parameters, string>, OptionsParam<Parameters>];

const abortController = new AbortController();

const renderUseFetch = (options?: OptionsParam<Parameters>) =>
  renderHook<UseFetchParams, Result<Parameters, string, unknown>>(() =>
    useFetch(requestName, mockFetchFn, options)
  );

describe('useFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderUseFetch();

    const { data, isLoading, error } = result.current;

    expect(data).toEqual(undefined);
    expect(isLoading).toEqual(false);
    expect(error).toEqual(undefined);

    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('should call fetch', async () => {
    const { result, waitForNextUpdate } = renderUseFetch();

    expect(result.current.data).toEqual(undefined);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.error).toEqual(undefined);

    await act(async () => {
      result.current.fetch(parameters);
      await waitForNextUpdate();
    });

    expect(result.current.data).toEqual(response);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.error).toEqual(undefined);
    expect(mockFetchFn).toHaveBeenCalledWith(parameters, abortController.signal);
  });

  it('should call fetch if initialParameters option defined', async () => {
    const { result, waitForNextUpdate } = renderUseFetch({ initialParameters: parameters });

    expect(result.current.data).toEqual(undefined);
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.error).toEqual(undefined);

    expect(mockFetchFn).toHaveBeenCalledWith(parameters, abortController.signal);

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.data).toEqual(response);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.error).toEqual(undefined);
  });

  it('should refetch with same parameters', async () => {
    const { result, waitForNextUpdate } = renderUseFetch({ initialParameters: parameters });

    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(mockFetchFn).toHaveBeenCalledWith(parameters, abortController.signal);

    await act(async () => {
      result.current.refetch();
      await waitForNextUpdate();
    });

    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(mockFetchFn).toHaveBeenCalledWith(parameters, abortController.signal);
  });

  it('should not call fetch if disabled option defined', async () => {
    const { result, waitForNextUpdate } = renderUseFetch({
      initialParameters: parameters,
      disabled: true,
    });

    expect(result.current.data).toEqual(undefined);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.error).toEqual(undefined);

    expect(mockFetchFn).not.toHaveBeenCalled();

    await act(async () => {
      result.current.fetch(parameters);
      await waitForNextUpdate();
    });

    expect(result.current.data).toEqual(undefined);
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.error).toEqual(undefined);
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('should ignore state change if component is unmounted', async () => {
    mockFetchFn.mockImplementationOnce(async () => {
      unmount();
      return response;
    });

    const { result, waitForNextUpdate, unmount } = renderUseFetch();

    expect(result.current.data).toEqual(undefined);

    await act(async () => {
      result.current.fetch(parameters);
      await waitForNextUpdate();
    });

    expect(result.current.data).toEqual(undefined);
  });

  it('should ignore state change if error but component is unmounted', async () => {
    mockFetchFn.mockImplementationOnce(async () => {
      unmount();
      throw new Error();
    });

    const { result, waitForNextUpdate, unmount } = renderUseFetch();

    expect(result.current.error).toEqual(undefined);

    await act(async () => {
      result.current.fetch(parameters);
      await waitForNextUpdate();
    });

    expect(result.current.error).toEqual(undefined);
  });

  it('should abort initial request if fetch is called', async () => {
    const firstAbortCtrl = new AbortController();
    const abortSpy = jest.spyOn(window, 'AbortController').mockReturnValueOnce(firstAbortCtrl);

    const { result, waitForNextUpdate } = renderUseFetch({ initialParameters: parameters });

    mockFetchFn.mockImplementationOnce(async () => {
      result.current.fetch(parameters);
      return response;
    });

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(firstAbortCtrl.signal.aborted).toEqual(true);

    abortSpy.mockRestore();
  });

  it('should abort first request if fetch is called twice', async () => {
    const firstAbortCtrl = new AbortController();
    const abortSpy = jest.spyOn(window, 'AbortController').mockReturnValueOnce(firstAbortCtrl);

    const { result, waitForNextUpdate } = renderUseFetch();

    mockFetchFn.mockImplementationOnce(async () => {
      result.current.fetch(parameters);
      return response;
    });

    await act(async () => {
      result.current.fetch(parameters);
      await waitForNextUpdate();
    });

    expect(firstAbortCtrl.signal.aborted).toEqual(true);

    abortSpy.mockRestore();
  });

  describe('APM tracking', () => {
    it('should track with request name', async () => {
      const { result, waitForNextUpdate } = renderUseFetch();

      await act(async () => {
        result.current.fetch(parameters);
        await waitForNextUpdate();
      });

      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockStartTracking).toHaveBeenCalledWith({ name: requestName });
    });

    it('should track each request', async () => {
      const { result, waitForNextUpdate } = renderUseFetch({
        initialParameters: parameters,
      });

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(1);
      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockStartTracking).toHaveBeenCalledWith({ name: requestName });

      await act(async () => {
        result.current.fetch(parameters);
        await waitForNextUpdate();
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(2);
      expect(mockStartTracking).toHaveBeenCalledTimes(2);
      expect(mockEndTracking).toHaveBeenCalledTimes(2);
    });

    it('should end success', async () => {
      const { result, waitForNextUpdate } = renderUseFetch();

      await act(async () => {
        result.current.fetch(parameters);
        await waitForNextUpdate();
      });

      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('success');
    });

    it('should end aborted', async () => {
      const abortCtrl = new AbortController();
      const abortSpy = jest.spyOn(window, 'AbortController').mockReturnValue(abortCtrl);

      mockFetchFn.mockImplementationOnce(async () => {
        abortCtrl.abort();
        throw Error('request aborted');
      });

      const { result, waitForNextUpdate } = renderUseFetch();

      await act(async () => {
        result.current.fetch(parameters);
        await waitForNextUpdate();
      });

      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('aborted');

      abortSpy.mockRestore();
    });

    it('should end error', async () => {
      mockFetchFn.mockImplementationOnce(async () => {
        throw Error('request error');
      });

      const { result, waitForNextUpdate } = renderUseFetch();

      await act(async () => {
        result.current.fetch(parameters);
        await waitForNextUpdate();
      });

      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('error');
    });
  });
});
