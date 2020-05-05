/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { mockRouter, RouterMock } from 'src/core/server/http/router/router.mock';
import { loggingServiceMock } from 'src/core/server/mocks';
import { httpServerMock } from 'src/core/server/http/http_server.mocks';
import { RouteValidatorConfig } from 'src/core/server/http/router/validator';

import { registerEnginesRoute } from './engines';
import { ObjectType } from '@kbn/config-schema';

jest.mock('node-fetch');
const fetch = jest.requireActual('node-fetch');
const { Response } = fetch;
const fetchMock = require('node-fetch') as jest.Mocked<typeof fetch>;

describe('engine routes', () => {
  describe('GET /api/app_search/engines', () => {
    const AUTH_HEADER = 'Basic 123';
    let router: RouterMock;
    const mockResponse = httpServerMock.createResponseFactory();
    const mockLogger = loggingServiceMock.create().get();

    beforeEach(() => {
      jest.resetAllMocks();
      router = mockRouter.create();
      registerEnginesRoute({
        router,
        log: mockLogger,
        config: {
          host: 'http://localhost:3002',
        },
      });
    });

    describe('when the underlying App Search API returns a 200', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page[current]=1&page[size]=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturn({
          results: [{ name: 'engine1' }],
          meta: { page: { total_results: 1 } },
        });
      });

      it('should return 200 with a list of engines from the App Search API', async () => {
        await callThisRoute();

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: { results: [{ name: 'engine1' }], meta: { page: { total_results: 1 } } },
          headers: { 'content-type': 'application/json' },
        });
      });
    });

    describe('when the underlying App Search API redirects to /login', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page[current]=1&page[size]=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturnRedirect();
      });

      it('should return 403 with a message', async () => {
        await callThisRoute();

        expect(mockResponse.forbidden).toHaveBeenCalledWith({
          body: 'no-as-account',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('No corresponding App Search account found');
      });
    });

    describe('when the App Search URL is invalid', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page[current]=1&page[size]=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturnError();
      });

      it('should return 404 with a message', async () => {
        await callThisRoute();

        expect(mockResponse.notFound).toHaveBeenCalledWith({
          body: 'cannot-connect',
        });
        expect(mockLogger.error).toHaveBeenCalledWith('Cannot connect to App Search: Failed');
        expect(mockLogger.debug).not.toHaveBeenCalled();
      });
    });

    describe('when the App Search API returns invalid data', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page[current]=1&page[size]=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturnInvalidData();
      });

      it('should return 404 with a message', async () => {
        await callThisRoute();

        expect(mockResponse.notFound).toHaveBeenCalledWith({
          body: 'cannot-connect',
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Cannot connect to App Search: Error: Invalid data received from App Search: {"foo":"bar"}'
        );
        expect(mockLogger.debug).toHaveBeenCalled();
      });
    });

    describe('validation', () => {
      function itShouldValidate(request: { query: object }) {
        it('should be validated', async () => {
          expect(() => executeRouteValidation(request)).not.toThrow();
        });
      }

      function itShouldThrow(request: { query: object }) {
        it('should throw', async () => {
          expect(() => executeRouteValidation(request)).toThrow();
        });
      }

      describe('when query is valid', () => {
        const request = { query: { type: 'meta', pageIndex: 5 } };
        itShouldValidate(request);
      });

      describe('pageIndex is wrong type', () => {
        const request = { query: { type: 'indexed', pageIndex: 'indexed' } };
        itShouldThrow(request);
      });

      describe('type is wrong string', () => {
        const request = { query: { type: 'invalid', pageIndex: 1 } };
        itShouldThrow(request);
      });

      describe('pageIndex is missing', () => {
        const request = { query: { type: 'indexed' } };
        itShouldThrow(request);
      });

      describe('type is missing', () => {
        const request = { query: { pageIndex: 1 } };
        itShouldThrow(request);
      });
    });

    const AppSearchAPI = {
      shouldBeCalledWith(expectedUrl: string, expectedParams: object) {
        return {
          andReturnRedirect() {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.resolve(
                new Response('{}', {
                  url: '/login',
                })
              );
            });
          },
          andReturn(response: object) {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.resolve(new Response(JSON.stringify(response)));
            });
          },
          andReturnInvalidData(response: object) {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.resolve(new Response(JSON.stringify({ foo: 'bar' })));
            });
          },
          andReturnError(response: object) {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.reject('Failed');
            });
          },
        };
      },
    };

    const callThisRoute = async (
      request = {
        headers: {
          authorization: AUTH_HEADER,
        },
        query: {
          type: 'indexed',
          pageIndex: 1,
        },
      }
    ) => {
      const [_, handler] = router.get.mock.calls[0];

      const context = {} as jest.Mocked<RequestHandlerContext>;
      await handler(context, httpServerMock.createKibanaRequest(request), mockResponse);
    };

    const executeRouteValidation = (data: { query: object }) => {
      const [config] = router.get.mock.calls[0];
      const validate = config.validate as RouteValidatorConfig<{}, {}, {}>;
      const query = validate.query as ObjectType;
      query.validate(data.query);
    };
  });
});
