/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSearch, useSearchStrategy } from '.';
import { act, renderHook } from '@testing-library/react-hooks';

import { useObservable } from '@kbn/securitysolution-hook-utils';
import type {
  FactoryQueryTypes,
  StrategyRequestInputType,
} from '../../../../common/search_strategy';
import { Observable } from 'rxjs';

jest.mock('@kbn/securitysolution-hook-utils');
const mockAddToastError = jest.fn();
const mockAddToastWarning = jest.fn();
jest.mock('../../hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn(() => ({
    addError: mockAddToastError,
    addWarning: mockAddToastWarning,
  })),
}));

// default to completed response
const mockResponse = jest.fn(
  () =>
    ({
      rawResponse: {},
      isPartial: false,
      isRunning: false,
    } as unknown)
);
const mockSearch = jest.fn(
  () =>
    new Observable((subscription) => {
      subscription.next(mockResponse());
    })
);
jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        data: {
          search: {
            search: mockSearch,
          },
        },
      },
    }),
  };
});

const mockEndTracking = jest.fn();
const mockStartTracking = jest.fn(() => ({
  endTracking: mockEndTracking,
}));
jest.mock('../../lib/apm/use_track_http_request', () => ({
  useTrackHttpRequest: () => ({ startTracking: mockStartTracking }),
}));

const mockAbortController = new AbortController();
mockAbortController.abort = jest.fn();

const useObservableHookResult = {
  start: jest.fn(),
  error: null,
  result: null,
  loading: false,
};

const factoryQueryType = 'testFactoryQueryType' as FactoryQueryTypes;
const userSearchStrategyProps = {
  factoryQueryType,
  initialResult: {},
  errorMessage: 'testErrorMessage',
};

const request = {
  fake: 'request',
  search: 'parameters',
} as unknown as StrategyRequestInputType<FactoryQueryTypes>;

describe('useSearchStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'AbortController').mockRestore();
  });

  it("returns the provided initial result while the query hasn't returned data", () => {
    const initialResult = {};
    (useObservable as jest.Mock).mockReturnValue(useObservableHookResult);

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({ ...userSearchStrategyProps, initialResult })
    );

    expect(result.current.result).toEqual(initialResult);
  });

  it('calls start with the given request', () => {
    const start = jest.fn();

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);
    expect(start).toBeCalledWith(expect.objectContaining({ request }));
  });

  it('returns inspect', () => {
    const dsl = 'testDsl';

    (useObservable as jest.Mock).mockReturnValue({
      ...useObservableHookResult,
      result: {
        rawResponse: {},
        inspect: {
          dsl,
        },
      },
    });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    expect(result.current.inspect).toEqual({
      dsl,
      response: ['{}'],
    });
  });

  it('shows toast error when the API returns error', () => {
    const error = 'test error';
    const errorMessage = 'error message title';
    (useObservable as jest.Mock).mockReturnValue({
      ...useObservableHookResult,
      error,
    });

    renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({ ...userSearchStrategyProps, errorMessage })
    );

    expect(mockAddToastError).toBeCalledWith(error, { title: errorMessage });
  });

  it('does not show toast error if showErrorToast = false', () => {
    const error = 'test error';
    const errorMessage = 'error message title';
    (useObservable as jest.Mock).mockReturnValue({
      ...useObservableHookResult,
      error,
    });

    renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({
        ...userSearchStrategyProps,
        showErrorToast: false,
        errorMessage,
      })
    );

    expect(mockAddToastError).not.toBeCalled();
  });

  it('start should be called when search is called ', () => {
    const start = jest.fn();

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);

    expect(start).toBeCalled();
  });

  it('refetch should execute the previous search again with the same params', async () => {
    const start = jest.fn();

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result, rerender } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);

    rerender();

    result.current.refetch();

    expect(start).toBeCalledTimes(2);
    expect(start.mock.calls[0]).toEqual(start.mock.calls[1]);
  });

  it('aborts previous search when a subsequent search is triggered', async () => {
    jest.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);

    (useObservable as jest.Mock).mockReturnValue(useObservableHookResult);

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);
    result.current.search(request);

    expect(mockAbortController.abort).toBeCalledTimes(2);
  });

  it('aborts search when component unmounts', async () => {
    jest.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);

    (useObservable as jest.Mock).mockReturnValue(useObservableHookResult);

    const { result, unmount } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);
    unmount();

    expect(mockAbortController.abort).toBeCalledTimes(2);
  });

  it('calls start with the AbortController signal', () => {
    jest.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);
    const start = jest.fn();

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);

    expect(start).toBeCalledWith(
      expect.objectContaining({ abortSignal: mockAbortController.signal })
    );
  });

  it('abort = true will cancel any running request', () => {
    jest.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);
    const localProps = { ...userSearchStrategyProps, abort: false };

    const { rerender } = renderHook(() => useSearchStrategy<FactoryQueryTypes>(localProps));
    localProps.abort = true;
    act(() => rerender());

    expect(mockAbortController.abort).toHaveBeenCalledTimes(1);
  });

  describe('search function', () => {
    it('should track successful search result', () => {
      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal });

      expect(mockStartTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledWith('success');
    });

    it('should handle search error', () => {
      mockResponse.mockImplementation(() => {
        throw new Error('simulated search error');
      });

      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal });

      expect(mockStartTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledWith('error');
    });

    it('should track error search result', () => {
      mockResponse.mockImplementationOnce(() => {
        throw Error('fake server error');
      });

      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal });

      expect(mockStartTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledWith('error');
    });

    it('should track aborted search result', () => {
      const abortController = new AbortController();
      mockResponse.mockImplementationOnce(() => {
        abortController.abort();
        throw Error('fake aborted');
      });

      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: abortController.signal });

      expect(mockStartTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledTimes(1);
      expect(mockEndTracking).toBeCalledWith('aborted');
    });
  });
});
