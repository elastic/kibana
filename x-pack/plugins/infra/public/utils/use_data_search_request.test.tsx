/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import { Observable, of, Subject, Subscriber, TeardownLogic } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  DataPublicPluginStart,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchGeneric,
  ISearchStart,
} from '../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';
import { PluginKibanaContextValue } from '../hooks/use_kibana';
import {
  DataSearchRequestDescriptor,
  useDataSearch,
  useLatestPartialDataSearchRequest,
} from './use_data_search_request';

describe('useDataSearch hook', () => {
  it('forwards the search function arguments to the getRequest function', async () => {
    const dataMock = createDataPluginMock();
    const { Provider: KibanaContextProvider } = createKibanaReactContext<
      Partial<PluginKibanaContextValue>
    >({
      data: dataMock,
    });

    const getRequest = jest.fn((_firstArgument: string, _secondArgument: string) => null);

    const {
      result: {
        current: { search },
      },
    } = renderHook(
      () =>
        useDataSearch({
          getRequest,
        }),
      {
        wrapper: ({ children }) => <KibanaContextProvider>{children}</KibanaContextProvider>,
      }
    );

    act(() => {
      search('first', 'second');
    });

    expect(getRequest).toHaveBeenLastCalledWith('first', 'second');
    expect(dataMock.search.search).not.toHaveBeenCalled();
  });

  it('creates search requests with the given params and options', async () => {
    const dataMock = createDataPluginMock();
    const searchResponseMock$ = of<IKibanaSearchResponse>({
      rawResponse: {
        firstKey: 'firstValue',
      },
    });
    dataMock.search.search.mockReturnValue(searchResponseMock$);
    const { Provider: KibanaContextProvider } = createKibanaReactContext<
      Partial<PluginKibanaContextValue>
    >({
      data: dataMock,
    });

    const getRequest = jest.fn((firstArgument: string, secondArgument: string) => ({
      request: {
        params: {
          firstArgument,
          secondArgument,
        },
      },
      options: {
        strategy: 'test-search-strategy',
      },
    }));

    const {
      result: {
        current: { search, requests$ },
      },
    } = renderHook(
      () =>
        useDataSearch({
          getRequest,
        }),
      {
        wrapper: ({ children }) => <KibanaContextProvider>{children}</KibanaContextProvider>,
      }
    );

    // the request execution is lazy
    expect(dataMock.search.search).not.toHaveBeenCalled();

    // execute requests$ observable
    const firstRequestPromise = requests$.pipe(take(1)).toPromise();

    act(() => {
      search('first', 'second');
    });

    const firstRequest = await firstRequestPromise;

    expect(dataMock.search.search).toHaveBeenLastCalledWith(
      {
        params: { firstArgument: 'first', secondArgument: 'second' },
      },
      {
        abortSignal: expect.any(Object),
        strategy: 'test-search-strategy',
      }
    );
    expect(firstRequest).toHaveProperty('abortController', expect.any(Object));
    expect(firstRequest).toHaveProperty('request.params', {
      firstArgument: 'first',
      secondArgument: 'second',
    });
    expect(firstRequest).toHaveProperty('options.strategy', 'test-search-strategy');
    expect(firstRequest).toHaveProperty('response$', expect.any(Observable));
    await expect(firstRequest.response$.toPromise()).resolves.toEqual({
      rawResponse: {
        firstKey: 'firstValue',
      },
    });
  });

  it('aborts the request when the response observable looses the last subscriber', async () => {
    const dataMock = createDataPluginMock();
    const searchResponseMock$ = new Subject<IKibanaSearchResponse>();
    dataMock.search.search.mockReturnValue(searchResponseMock$);
    const { Provider: KibanaContextProvider } = createKibanaReactContext<
      Partial<PluginKibanaContextValue>
    >({
      data: dataMock,
    });

    const getRequest = jest.fn((firstArgument: string, secondArgument: string) => ({
      request: {
        params: {
          firstArgument,
          secondArgument,
        },
      },
      options: {
        strategy: 'test-search-strategy',
      },
    }));

    const {
      result: {
        current: { search, requests$ },
      },
    } = renderHook(
      () =>
        useDataSearch({
          getRequest,
        }),
      {
        wrapper: ({ children }) => <KibanaContextProvider>{children}</KibanaContextProvider>,
      }
    );

    // the request execution is lazy
    expect(dataMock.search.search).not.toHaveBeenCalled();

    // execute requests$ observable
    const firstRequestPromise = requests$.pipe(take(1)).toPromise();

    act(() => {
      search('first', 'second');
    });

    const firstRequest = await firstRequestPromise;

    // execute requests$ observable
    const firstResponseSubscription = firstRequest.response$.subscribe({
      next: jest.fn(),
    });

    // get the abort signal
    const [, firstRequestOptions] = dataMock.search.search.mock.calls[0];

    expect(firstRequestOptions?.abortSignal?.aborted).toBe(false);

    // unsubscribe
    firstResponseSubscription.unsubscribe();

    expect(firstRequestOptions?.abortSignal?.aborted).toBe(true);
  });
});

describe('useLatestPartialDataSearchRequest hook', () => {
  it("subscribes to the latest request's response observable", async () => {
    const requests$ = new Subject<
      DataSearchRequestDescriptor<IKibanaSearchRequest<string>, string>
    >();

    const {
      result: {
        current: {},
      },
    } = renderHook(() =>
      useLatestPartialDataSearchRequest(requests$, 'initial', (response) => ({
        data: `projection of ${response}`,
      }))
    );

    requests$.next(defer());
  });
});

const createDataPluginMock = () => {
  const dataMock = dataPluginMock.createStartContract() as DataPublicPluginStart & {
    search: ISearchStart & { search: jest.MockedFunction<ISearchGeneric> };
  };
  return dataMock;
};

const createSpyObservable = <T extends any>(
  subscribe: (subscriber: Subscriber<T>) => TeardownLogic
): Observable<T> & {
  onSubscribe: jest.Mock;
  onUnsubscribe: jest.Mock;
} => {
  const onSubscribe = jest.fn();
  const onUnsubscribe = jest.fn();
  const observable = new Observable<T>((subscriber) => {
    onSubscribe();
    const teardownLogic = subscribe(subscriber);

    return () => {
      onUnsubscribe();
      teardownLogic();
    };
  });

  return Object.assign(observable, {
    onSubscribe,
    onUnsubscribe,
  });
};
