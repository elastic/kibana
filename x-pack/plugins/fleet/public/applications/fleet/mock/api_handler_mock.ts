/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';

type ResponseProviderMocks = Record<string, jest.MockedFunction<() => unknown>>;

interface MockedApi<R extends ResponseProviderMocks = ResponseProviderMocks> {
  /** Will return a promise that resolves when triggered APIs are complete */
  waitForApi: () => Promise<void>;
  /** A object containing the list of API response provider functions that are used by the mocked API */
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

class ApiRouteNotMocked extends Error {
  constructor(message: string) {
    super(message);
  }
}

interface RouteMock<R extends ResponseProviderMocks = ResponseProviderMocks> {
  id: keyof R;
  method: HttpMethods;
  path: string;
  handler: jest.MockedFunction<() => unknown>;
}

export type ApiHandlerMockFactoryProps<
  R extends ResponseProviderMocks = ResponseProviderMocks
> = Array<RouteMock<R>>;
/**
 * Returns a function that can be used to mock `core.http` methods during testing
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

    const mockedApiInterface: MockedApi<R> = {
      waitForApi() {
        return new Promise((resolve) => {
          if (inflightApiCalls > 0) {
            apiDoneListeners.push(resolve);
          } else {
            resolve();
          }
        });
      },
      responseProvider: mocks.reduce<R>((providers, routeMock) => {
        // @ts-ignore
        providers[routeMock.id] = routeMock.handler;
        return providers;
      }, {} as R),
    };

    HTTP_METHODS.forEach((method) => {
      const priorMockedFunction = http[method].getMockImplementation();

      http[method].mockImplementation((...args) => {
        const path = args[0];

        if (mocks[method]) {
          const routeMock = mocks[method].find((handler) => handler.path === path);

          if (routeMock) {
            markApiCallAsHandled();
            return routeMock.handler(...args);
          } else if (priorMockedFunction) {
            return priorMockedFunction(...args);
          }
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
