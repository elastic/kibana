/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSearchStrategy } from './index';
import { act, renderHook } from '@testing-library/react-hooks';

import { useObservable } from '@kbn/securitysolution-hook-utils';
import { FactoryQueryTypes } from '../../../../common/search_strategy';

jest.mock('../../../transforms/containers/use_transforms', () => ({
  useTransforms: jest.fn(() => ({
    getTransformChangesIfTheyExist: null,
  })),
}));

const mockAddToastError = jest.fn();

jest.mock('../../hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn(() => ({
    addError: mockAddToastError,
  })),
}));

jest.mock('@kbn/securitysolution-hook-utils');

const useObservableHookResult = {
  start: jest.fn(),
  error: null,
  result: null,
  loading: false,
};

const userSearchStrategyProps = {
  factoryQueryType: 'testFactoryQueryType' as FactoryQueryTypes,
  initialResult: {},
  errorMessage: 'testErrorMessage',
};

describe('useSearchStrategy', () => {
  it("returns the provided initial result while the query hasn't returned data", () => {
    const initialResult = {};
    (useObservable as jest.Mock).mockReturnValue(useObservableHookResult);

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({ ...userSearchStrategyProps, initialResult })
    );

    expect(result.current.result).toBe(initialResult);
  });

  it('calls start with the given factoryQueryType', () => {
    const factoryQueryType = 'fakeQueryType' as FactoryQueryTypes;
    const start = jest.fn();

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({
        ...userSearchStrategyProps,
        factoryQueryType,
      })
    );

    result.current.search({});

    expect(start).toBeCalledWith(expect.objectContaining({ factoryQueryType }));
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

  it('start should be called when search is called ', () => {
    const start = jest.fn();
    const searchParams = {};

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(searchParams);

    expect(start).toBeCalled();
  });

  it('refetch should execute the previous search again with the same params', async () => {
    const start = jest.fn();
    const searchParams = {};

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result, rerender } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(searchParams);

    rerender();

    result.current.refetch();

    expect(start).toBeCalledTimes(2);
    expect(start.mock.calls[0]).toEqual(start.mock.calls[1]);
  });

  it('aborts previous search when a subsequent search is triggered', async () => {
    const searchParams = {};
    const abortFunction = jest.fn();
    jest
      .spyOn(window, 'AbortController')
      .mockReturnValue({ abort: abortFunction, signal: {} as AbortSignal });

    (useObservable as jest.Mock).mockReturnValue(useObservableHookResult);

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(searchParams);
    result.current.search(searchParams);

    expect(abortFunction).toBeCalledTimes(2);
  });

  it('aborts search when component unmounts', async () => {
    const searchParams = {};
    const abortFunction = jest.fn();
    jest
      .spyOn(window, 'AbortController')
      .mockReturnValue({ abort: abortFunction, signal: {} as AbortSignal });

    (useObservable as jest.Mock).mockReturnValue(useObservableHookResult);

    const { result, unmount } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(searchParams);
    unmount();

    expect(abortFunction).toBeCalledTimes(2);
  });

  it('calls start with the AbortController signal', () => {
    const factoryQueryType = 'fakeQueryType' as FactoryQueryTypes;
    const start = jest.fn();
    const signal = new AbortController().signal;
    jest.spyOn(window, 'AbortController').mockReturnValue({ abort: jest.fn(), signal });

    (useObservable as jest.Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({
        ...userSearchStrategyProps,
        factoryQueryType,
      })
    );

    result.current.search({});

    expect(start).toBeCalledWith(expect.objectContaining({ signal }));
  });
  it('skip = true will cancel any running request', () => {
    const abortSpy = jest.fn();
    const signal = new AbortController().signal;
    jest.spyOn(window, 'AbortController').mockReturnValue({ abort: abortSpy, signal });
    const factoryQueryType = 'fakeQueryType' as FactoryQueryTypes;
    const localProps = {
      ...userSearchStrategyProps,
      skip: false,
      factoryQueryType,
    };
    const { rerender } = renderHook(() => useSearchStrategy<FactoryQueryTypes>(localProps));
    localProps.skip = true;
    act(() => rerender());
    expect(abortSpy).toHaveBeenCalledTimes(1);
  });
});
