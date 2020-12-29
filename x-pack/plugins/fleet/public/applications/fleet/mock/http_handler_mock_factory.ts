/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpFetchOptionsWithPath, HttpHandler, HttpStart } from 'kibana/public';
import { extend } from 'lodash';
import { act } from '@testing-library/react';

class ApiRouteNotMocked extends Error {
  constructor(message: string) {
    super(message);
  }
}

type ResponseProviderMocks = Record<string, jest.MockedFunction<any>>;

interface MockedApi<R extends ResponseProviderMocks = ResponseProviderMocks> {
  /**
   * Will return a promise that resolves when triggered APIs are all complete. This method uses
   * React testing `act()` to await for the API calls, thus ensuring that the UI components are
   * updated with any state that was affected by the returned API responses.
   */
  waitForApi: () => Promise<void>;
  /**
   * A object containing the list of API response provider functions that are used by the mocked API.
   * These API response methods are wrapped in `jest.MockedFunction<>`, thus their implementation or
   * returned values can be manipulated by each test case.
   */
  responseProvider: Readonly<R>;
}

type HttpMethods = keyof Pick<
  HttpStart,
  'delete' | 'fetch' | 'get' | 'post' | 'put' | 'head' | 'patch'
>;

const HTTP_METHODS: HttpMethods[] = ['delete', 'fetch', 'get', 'post', 'put', 'head', 'patch'];

export type ApiHandlerMock<R extends ResponseProviderMocks = ResponseProviderMocks> = (
  http: jest.Mocked<HttpStart>
) => MockedApi<R>;

interface RouteMock<R extends ResponseProviderMocks = ResponseProviderMocks> {
  id: keyof R;
  method: HttpMethods;
  path: string;
  /**
   * The handler for providing a response to for this API call.
   * It should return the "raw" value, __NOT__ a `Promise`
   */
  handler: (...args: Parameters<HttpHandler>) => any;
}

export type ApiHandlerMockFactoryProps<
  R extends ResponseProviderMocks = ResponseProviderMocks
> = Array<RouteMock<R>>;
/**
 * Returns a function that can be used to mock `core.http` methods during testing
 *
 * @example
 *
 * const mockEpmApi = httpHandlerMockFactory([
 *  {
 *    id: 'epmGetInfo',
 *    method: 'get',
 *    path: '/api/fleet/epm/something',
 *    handler: () => 'returnValueHere'
 *  }
 * ]);
 * // In a test - usually in a `beforeEach()`
 * let mockedApi;
 * beforeEach(() => {
 *   mockedApi = mockEpmApi(core.http);
 * });
 */
export const httpHandlerMockFactory = <R extends ResponseProviderMocks = ResponseProviderMocks>(
  mocks: ApiHandlerMockFactoryProps<R>
): ApiHandlerMock<R> => {
  return (http) => {
    let inflightApiCalls = 0;
    const apiDoneListeners: Array<() => void> = [];
    const markApiCallAsHandled = async () => {
      inflightApiCalls++;
      await new Promise((r) => setTimeout(r, 1));
      inflightApiCalls--;

      // If no more pending API calls, then notify listeners
      if (inflightApiCalls === 0 && apiDoneListeners.length > 0) {
        apiDoneListeners.splice(0).forEach((listener) => listener());
      }
    };

    const responseProvider: MockedApi<R>['responseProvider'] = mocks.reduce<R>(
      (providers, routeMock) => {
        // @ts-ignore
        providers[routeMock.id] = jest.fn(routeMock.handler);
        return providers;
      },
      {} as R
    );

    const mockedApiInterface: MockedApi<R> = {
      async waitForApi() {
        await act(async () => {
          await new Promise<void>((resolve) => {
            if (inflightApiCalls > 0) {
              apiDoneListeners.push(resolve);
            } else {
              resolve();
            }
          });
        });
      },
      responseProvider,
    };

    HTTP_METHODS.forEach((method) => {
      const priorMockedFunction = http[method].getMockImplementation();
      const methodMocks = mocks.filter((mock) => mock.method === method);

      http[method].mockImplementation(async (...args) => {
        const path = isHttpFetchOptionsWithPath(args[0]) ? args[0].path : args[0];
        const routeMock = methodMocks.find((handler) => handler.path === path);

        if (routeMock) {
          markApiCallAsHandled();
          // Use the handler defined for the HTTP Mocked interface (not the one passed on input to
          // the factory) for retrieving the response value because that one could have had its
          // response value manipulated by the individual test case.
          return responseProvider[routeMock.id](...args);
        } else if (priorMockedFunction) {
          return priorMockedFunction(...args);
        }

        const err = new ApiRouteNotMocked(`API [${method.toUpperCase()} ${path}] is not MOCKED!`);
        // eslint-disable-next-line no-console
        console.error(err);
        throw err;
      });
    });

    return mockedApiInterface;
  };
};

const isHttpFetchOptionsWithPath = (
  opt: string | HttpFetchOptions | HttpFetchOptionsWithPath
): opt is HttpFetchOptionsWithPath => {
  return 'object' === typeof opt && 'path' in opt;
};

/**
 * Compose a new API Handler mock based upon a list of one or more Api Handlers.
 * Returns a new function (`ApiHandlerMock`) that applies all provided handler mocks to the `core.http`
 * service while at the same time supporting a `waitForApi()` method that will wait all handlers.
 *
 * @example
 * import { composeApiHandlerMocks } from './http_handler_mock_factory';
 * import {
 *   fleetSetupApiMock,
 *   agentsSetupApiMock,
 * } from './setup';
 *
 * // Create the new interface as an intersection of all other Api Handler Mocks
 * type ComposedApiHandlerMocks = ReturnType<typeof agentsSetupApiMock> & ReturnType<typeof fleetSetupApiMock>
 *
 * const newComposedHandlerMock = composeApiHandlerMocks<
 *  ComposedApiHandlerMocks
 * >([fleetSetupApiMock, agentsSetupApiMock]);
 */
export const composeApiHandlerMocks = <R extends ResponseProviderMocks = ResponseProviderMocks>(
  handlerMocks: ApiHandlerMock[]
): ApiHandlerMock<R> => {
  return (http: HttpStart) => {
    const waitForApiHandlers: Array<MockedApi['waitForApi']> = [];
    const mockedApiInterfaces: MockedApi<R> = {
      async waitForApi() {
        await act(
          async () =>
            await Promise.all(
              waitForApiHandlers.map((handlerWaitFor) => handlerWaitFor())
            ).then(() => {})
        );
      },
      // @ts-ignore
      responseProvider: {},
    };

    handlerMocks.forEach((handlerMock) => {
      const { waitForApi, ...otherInterfaceProps } = handlerMock(http);
      extend(mockedApiInterfaces, otherInterfaceProps);
    });

    return mockedApiInterfaces;
  };
};
