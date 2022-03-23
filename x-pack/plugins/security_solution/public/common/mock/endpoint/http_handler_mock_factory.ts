/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { HttpFetchOptions, HttpFetchOptionsWithPath, HttpStart } from 'kibana/public';
import { merge } from 'lodash';
import { act } from '@testing-library/react';

class ApiRouteNotMocked extends Error {}

// Source: https://stackoverflow.com/a/43001581
type Writeable<T> = { -readonly [P in keyof T]: T[P] };

/** The callback that will be executed to retrieve an HTTP API response */
export type ResponseProviderCallback<F extends (...args: any) => any = (...args: any) => any> = F;

/**
 * Generic interface to facilitate defining the map of HTTP response provider callbacks
 * that will be exposed when the mock is applied
 *
 * @example
 *  type FleetSetupResponseProvidersMock = ResponseProvidersInterface<{
 *    fleetSetup: () => PostFleetSetupResponse;
 *  }>;
 */
export type ResponseProvidersInterface<
  I extends Record<string, ResponseProviderCallback> = Record<string, ResponseProviderCallback>
> = I;

type SingleResponseProvider<F extends ResponseProviderCallback = ResponseProviderCallback> =
  jest.MockedFunction<F> & {
    /**
     * Delay responding to the HTTP call until this promise is resolved. Use it to introduce
     * elongated delays in order to test intermediate UI states.
     *
     * @param options
     *
     * @example
     * apiMocks.responseProvider.someProvider.mockDelay
     *    // Delay this response by 1/2 second
     *    .mockImplementation(
     *      () => new Promise(r => setTimeout(r, 500))
     *    )
     */
    mockDelay: jest.MockedFunction<(options: HttpFetchOptionsWithPath) => Promise<void>>;
  };

/**
 * The interface for a `core.http` set of mocked API responses.
 */
interface MockedApi<R extends ResponseProvidersInterface = ResponseProvidersInterface> {
  /**
   * Will return a promise that resolves when triggered APIs are all complete. This method uses
   * React testing `act()` to await for the API calls, thus ensuring that the UI components are
   * updated with any state that was affected by the returned API responses.
   */
  waitForApi: () => Promise<void>;
  /**
   * A object containing the list of API response provider functions that are used by the mocked API.
   * These API response methods are wrapped in `jest.MockedFunction`, thus their implementation or
   * returned values can be manipulated by each test case using the normal `jest.mock` interface.
   * In addition to the normal `jest.Mock` properties and functions, an additional method is also
   * available - `mockDelay()` - which can be used to delay the given response being returned by the
   * associated HTTP method.
   */
  responseProvider: Readonly<{
    [K in keyof R]: SingleResponseProvider<R[K]>;
  }>;
}

type HttpMethods = keyof Pick<
  HttpStart,
  'delete' | 'fetch' | 'get' | 'post' | 'put' | 'head' | 'patch'
>;

const HTTP_METHODS: HttpMethods[] = ['delete', 'fetch', 'get', 'post', 'put', 'head', 'patch'];

export type ApiHandlerMock<R extends ResponseProvidersInterface = ResponseProvidersInterface> = (
  http: jest.Mocked<HttpStart>,
  options?: { ignoreUnMockedApiRouteErrors?: boolean }
) => MockedApi<R>;

interface RouteMock<R extends ResponseProvidersInterface = ResponseProvidersInterface> {
  /**
   * A legible identifier for the Mock. Will be used as the name in the `MockedApi`
   * that is returned when the HTTP mock is applied
   */
  id: keyof R;
  method: HttpMethods;
  path: string;
  /**
   * The handler for providing a response to for this API call.
   * It should return the "raw" value, __NOT__ a `Promise`
   */
  handler: (options: HttpFetchOptionsWithPath) => any;
  /**
   * A function that returns a promise. The API response will be delayed until this promise is
   * resolved. This can be helpful when wanting to test an intermediate UI state while the API
   * call is inflight. The options provided to the `core.http.*` method will be provided on input
   */
  delay?: (options: HttpFetchOptionsWithPath) => Promise<void>;
}

export type ApiHandlerMockFactoryProps<
  R extends ResponseProvidersInterface = ResponseProvidersInterface
> = Array<RouteMock<R>>;
/**
 * Returns a function that can be used to apply mocked responses to calls made via `core.http`
 * methods during testing.
 *
 * @example
 *
 * const mockEpmApi = httpHandlerMockFactory<{ epmGetInfo: () => GetInfoResponse }>([
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
export const httpHandlerMockFactory = <R extends ResponseProvidersInterface = {}>(
  mocks: ApiHandlerMockFactoryProps<R>
): ApiHandlerMock<R> => {
  return (http, options) => {
    let inflightApiCalls = 0;
    const { ignoreUnMockedApiRouteErrors = false } = options ?? {};
    const apiDoneListeners: Array<() => void> = [];
    const markApiCallAsInFlight = () => {
      inflightApiCalls++;
    };
    const markApiCallAsHandled = async () => {
      // We always wait at least 1ms
      await new Promise((r) => setTimeout(r, 1));

      inflightApiCalls--;

      // If no more pending API calls, then notify listeners
      if (inflightApiCalls === 0 && apiDoneListeners.length > 0) {
        apiDoneListeners.splice(0).forEach((listener) => listener());
      }
    };

    // For debugging purposes.
    // It will provide a stack trace leading back to the location in the test file
    // where the `core.http` mocks were applied from.
    const testContextStackTrace = new Error('HTTP MOCK APPLIED FROM:').stack;

    const responseProvider: MockedApi<R>['responseProvider'] = mocks.reduce(
      (providers, routeMock) => {
        // FIXME: find a way to remove the ignore below. May need to limit the calling signature of `RouteMock['handler']`
        // @ts-expect-error TS2322
        const routeResponseCallbackMock: SingleResponseProvider<R[keyof R]> = jest.fn(
          routeMock.handler
        );
        routeResponseCallbackMock.mockDelay = jest.fn(routeMock.delay || (async () => {}));

        providers[routeMock.id] = routeResponseCallbackMock;
        return providers;
      },
      {} as Writeable<MockedApi<R>['responseProvider']>
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
        const routeMock = methodMocks.find((handler) => pathMatchesPattern(handler.path, path));

        if (routeMock) {
          // Use the handler defined for the HTTP Mocked interface (not the one passed on input to
          // the factory) for retrieving the response value because that one could have had its
          // response value manipulated by the individual test case.
          const thisRouteResponseProvider = responseProvider[routeMock.id];
          const fetchOptions: HttpFetchOptionsWithPath = isHttpFetchOptionsWithPath(args[0])
            ? args[0]
            : {
                // Ignore below is needed because the http service methods are defined via an overloaded interface.
                // If the first argument is NOT fetch with options, then we know that its a string and `args` has
                // a potential for being of `.length` 2.
                // @ts-expect-error TS2493
                ...(args[1] || {}),
                path: args[0],
              };

          markApiCallAsInFlight();

          // If a delay was defined, then wait for that to complete
          if (thisRouteResponseProvider.mockDelay) {
            await thisRouteResponseProvider.mockDelay(fetchOptions);
          }

          try {
            return thisRouteResponseProvider(fetchOptions);
          } catch (err) {
            err.stack += `\n${testContextStackTrace}`;
            return Promise.reject(err);
          } finally {
            markApiCallAsHandled();
          }
        } else if (priorMockedFunction) {
          return priorMockedFunction(...args);
        }

        if (ignoreUnMockedApiRouteErrors) {
          return;
        }

        const err = new ApiRouteNotMocked(`API [${method.toUpperCase()} ${path}] is not MOCKED!`);
        // Append additional stack calling data from when this API mock was applied
        err.stack += `\n${testContextStackTrace}`;

        // eslint-disable-next-line no-console
        console.error(err);
        throw err;
      });
    });

    return mockedApiInterface;
  };
};

const pathMatchesPattern = (pathPattern: string, path: string): boolean => {
  // No path params - pattern is single path
  if (pathPattern === path) {
    return true;
  }

  // If pathPattern has params (`{value}`), then see if `path` matches it
  if (/{.*?}/.test(pathPattern)) {
    const pathParts = path.split(/\//);
    const patternParts = pathPattern.split(/\//);

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    return pathParts.every((part, index) => {
      return part === patternParts[index] || /{.*?}/.test(patternParts[index]);
    });
  }

  return false;
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
 *   FleetSetupApiMockInterface,
 *   fleetSetupApiMock,
 *   AgentsSetupApiMockInterface,
 *   agentsSetupApiMock,
 * } from './setup';
 *
 * // Create the new interface as an intersection of all other Api Handler Mock's interfaces
 * type ComposedApiHandlerMocks = AgentsSetupApiMockInterface & FleetSetupApiMockInterface
 *
 * const newComposedHandlerMock = composeApiHandlerMocks<
 *  ComposedApiHandlerMocks
 * >([fleetSetupApiMock, agentsSetupApiMock]);
 */
export const composeHttpHandlerMocks = <
  R extends ResponseProvidersInterface = ResponseProvidersInterface
>(
  handlerMocks: ApiHandlerMock[]
): ApiHandlerMock<R> => {
  return (http) => {
    const waitForApiHandlers: Array<MockedApi['waitForApi']> = [];
    const mockedApiInterfaces: MockedApi<R> = {
      async waitForApi() {
        await act(async () =>
          Promise.all(waitForApiHandlers.map((handlerWaitFor) => handlerWaitFor())).then(() => {})
        );
      },
      // Ignore here because we populate this object with the entries provided
      // via the input argument `handlerMocks`
      // @ts-expect-error TS2322
      responseProvider: {},
    };

    handlerMocks.forEach((handlerMock) => {
      const { waitForApi, ...otherInterfaceProps } = handlerMock(http);
      merge(mockedApiInterfaces, otherInterfaceProps);
    });

    return mockedApiInterfaces;
  };
};
