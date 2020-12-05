/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Observable, of, Subject } from 'rxjs';
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

    const { result } = renderHook(
      () =>
        useDataSearch({
          getRequest,
        }),
      {
        wrapper: ({ children }) => <KibanaContextProvider>{children}</KibanaContextProvider>,
      }
    );

    act(() => {
      result.current.search('first', 'second');
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

    const { result } = renderHook(
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
    const firstRequestPromise = result.current.requests$.pipe(take(1)).toPromise();

    act(() => {
      result.current.search('first', 'second');
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

    const { result } = renderHook(
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
    const firstRequestPromise = result.current.requests$.pipe(take(1)).toPromise();

    act(() => {
      result.current.search('first', 'second');
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
  it("subscribes to the latest request's response observable", () => {
    const firstRequest = {
      abortController: new AbortController(),
      options: {},
      request: { params: 'firstRequestParam' },
      response$: new Subject<IKibanaSearchResponse<string>>(),
    };

    const secondRequest = {
      abortController: new AbortController(),
      options: {},
      request: { params: 'secondRequestParam' },
      response$: new Subject<IKibanaSearchResponse<string>>(),
    };

    const requests$ = new Subject<
      DataSearchRequestDescriptor<IKibanaSearchRequest<string>, string>
    >();

    const { result } = renderHook(() =>
      useLatestPartialDataSearchRequest(requests$, 'initial', (response) => ({
        data: `projection of ${response}`,
      }))
    );

    expect(result).toHaveProperty('current.isRequestRunning', false);
    expect(result).toHaveProperty('current.latestResponseData', undefined);

    // first request is started
    act(() => {
      requests$.next(firstRequest);
    });

    expect(result).toHaveProperty('current.isRequestRunning', true);
    expect(result).toHaveProperty('current.latestResponseData', 'initial');

    // first response of the first request arrives
    act(() => {
      firstRequest.response$.next({ rawResponse: 'request-1-response-1', isRunning: true });
    });

    expect(result).toHaveProperty('current.isRequestRunning', true);
    expect(result).toHaveProperty(
      'current.latestResponseData',
      'projection of request-1-response-1'
    );

    // second request is started before the second response of the first request arrives
    act(() => {
      requests$.next(secondRequest);
      secondRequest.response$.next({ rawResponse: 'request-2-response-1', isRunning: true });
    });

    expect(result).toHaveProperty('current.isRequestRunning', true);
    expect(result).toHaveProperty(
      'current.latestResponseData',
      'projection of request-2-response-1'
    );

    // second response of the second request arrives
    act(() => {
      secondRequest.response$.next({ rawResponse: 'request-2-response-2', isRunning: false });
    });

    expect(result).toHaveProperty('current.isRequestRunning', false);
    expect(result).toHaveProperty(
      'current.latestResponseData',
      'projection of request-2-response-2'
    );
  });

  it("unsubscribes from the latest request's response observable on unmount", () => {
    const onUnsubscribe = jest.fn();

    const firstRequest = {
      abortController: new AbortController(),
      options: {},
      request: { params: 'firstRequestParam' },
      response$: new Observable<IKibanaSearchResponse<string>>(() => {
        return onUnsubscribe;
      }),
    };

    const requests$ = of<DataSearchRequestDescriptor<IKibanaSearchRequest<string>, string>>(
      firstRequest
    );

    const { unmount } = renderHook(() =>
      useLatestPartialDataSearchRequest(requests$, 'initial', (response) => ({
        data: `projection of ${response}`,
      }))
    );

    expect(onUnsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(onUnsubscribe).toHaveBeenCalled();
  });
});

const createDataPluginMock = () => {
  const dataMock = dataPluginMock.createStartContract() as DataPublicPluginStart & {
    search: ISearchStart & { search: jest.MockedFunction<ISearchGeneric> };
  };
  return dataMock;
};
