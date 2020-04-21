/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { mockRouter, RouterMock } from 'src/core/server/http/router/router.mock';
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
    const mockResponseFactory = httpServerMock.createResponseFactory();

    beforeEach(() => {
      jest.resetAllMocks();
      router = mockRouter.create();
      registerEnginesRoute({
        router,
        config: {
          host: 'http://localhost:3002',
        },
      });
    });

    describe('when the underlying App Search API returns a 200', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page[current]=1&page[size]=10`,
          {
            headers: { Authorization: AUTH_HEADER },
          }
        ).andReturn({ name: 'engine1' });
      });

      it('should return 200 with a list of engines from the App Search API', async () => {
        await callThisRoute();

        expectResponseToBe200With({
          body: { name: 'engine1' },
          headers: { 'content-type': 'application/json' },
        });
      });
    });

    describe('when the underlying App Search API redirects to /login', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page[current]=1&page[size]=10`,
          {
            headers: { Authorization: AUTH_HEADER },
          }
        ).andReturnRedirect();
      });

      it('should return 200 with a message', async () => {
        await callThisRoute();

        expectResponseToBe200With({
          body: { message: 'no-as-account' },
          headers: { 'content-type': 'application/json' },
        });
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
        const request = { query: { type: 'indexed', pageIndex: 1 } };
        itShouldValidate(request);
      });

      describe('pageIndex is wrong type', () => {
        const request = { query: { type: 'indexed', pageIndex: 'indexed' } };
        itShouldThrow(request);
      });

      describe('type is wrong type', () => {
        const request = { query: { type: 1, pageIndex: 1 } };
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
        };
      },
    };

    const expectResponseToBe200With = (response: object) => {
      expect(mockResponseFactory.ok).toHaveBeenCalledWith(response);
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
      await handler(context, httpServerMock.createKibanaRequest(request), mockResponseFactory);
    };

    const executeRouteValidation = (data: { query: object }) => {
      const [config] = router.get.mock.calls[0];
      const validate = config.validate as RouteValidatorConfig<{}, {}, {}>;
      const query = validate.query as ObjectType;
      query.validate(data.query);
    };
  });
});
