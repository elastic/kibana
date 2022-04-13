/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { firstValueFrom, Observable, of, Subject } from 'rxjs';
import {
  DataPublicPluginStart,
  IKibanaSearchResponse,
  ISearchGeneric,
  ISearchStart,
} from '../../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { createKibanaReactContext } from '../../../../../../src/plugins/kibana_react/public';
import { PluginKibanaContextValue } from '../../hooks/use_kibana';
import { normalizeDataSearchResponses } from './normalize_data_search_responses';
import { useDataSearch } from './use_data_search_request';

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
          parseResponses: noopParseResponse,
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

  it('creates search requests with the given params and options and parses the responses', async () => {
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
          parseResponses: noopParseResponse,
        }),
      {
        wrapper: ({ children }) => <KibanaContextProvider>{children}</KibanaContextProvider>,
      }
    );

    // the request execution is lazy
    expect(dataMock.search.search).not.toHaveBeenCalled();

    // execute requests$ observable
    const firstRequestPromise = firstValueFrom(result.current.requests$);

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
    await expect(firstRequest.response$.toPromise()).resolves.toMatchObject({
      data: {
        firstKey: 'firstValue', // because this specific response parser just copies the raw response
      },
      errors: [],
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
          parseResponses: noopParseResponse,
        }),
      {
        wrapper: ({ children }) => <KibanaContextProvider>{children}</KibanaContextProvider>,
      }
    );

    // the request execution is lazy
    expect(dataMock.search.search).not.toHaveBeenCalled();

    // execute requests$ observable
    const firstRequestPromise = firstValueFrom(result.current.requests$);

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

const createDataPluginMock = () => {
  const dataMock = dataPluginMock.createStartContract() as DataPublicPluginStart & {
    search: ISearchStart & { search: jest.MockedFunction<ISearchGeneric> };
  };
  return dataMock;
};

const noopParseResponse = normalizeDataSearchResponses(
  null,
  <Response extends any>(response: Response) => ({ data: response })
);
