/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockConfig, mockLogger } from '../__mocks__';

import { registerEnginesRoute } from './engines';

jest.mock('node-fetch');
const fetch = jest.requireActual('node-fetch');
const { Response } = fetch;
const fetchMock = require('node-fetch') as jest.Mocked<typeof fetch>;

describe('engine routes', () => {
  describe('GET /api/app_search/engines', () => {
    const AUTH_HEADER = 'Basic 123';
    const mockRequest = {
      headers: {
        authorization: AUTH_HEADER,
      },
      query: {
        type: 'indexed',
        pageIndex: 1,
      },
    };

    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'get', payload: 'query' });

      registerEnginesRoute({
        router: mockRouter.router,
        log: mockLogger,
        config: mockConfig,
      });
    });

    describe('when the underlying App Search API returns a 200', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page%5Bcurrent%5D=1&page%5Bsize%5D=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturn({
          results: [{ name: 'engine1' }],
          meta: { page: { total_results: 1 } },
        });
      });

      it('should return 200 with a list of engines from the App Search API', async () => {
        await mockRouter.callRoute(mockRequest);

        expect(mockRouter.response.ok).toHaveBeenCalledWith({
          body: { results: [{ name: 'engine1' }], meta: { page: { total_results: 1 } } },
        });
      });
    });

    describe('when the App Search URL is invalid', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page%5Bcurrent%5D=1&page%5Bsize%5D=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturnError();
      });

      it('should return 404 with a message', async () => {
        await mockRouter.callRoute(mockRequest);

        expect(mockRouter.response.notFound).toHaveBeenCalledWith({
          body: 'cannot-connect',
        });
        expect(mockLogger.error).toHaveBeenCalledWith('Cannot connect to App Search: Failed');
        expect(mockLogger.debug).not.toHaveBeenCalled();
      });
    });

    describe('when the App Search API returns invalid data', () => {
      beforeEach(() => {
        AppSearchAPI.shouldBeCalledWith(
          `http://localhost:3002/as/engines/collection?type=indexed&page%5Bcurrent%5D=1&page%5Bsize%5D=10`,
          { headers: { Authorization: AUTH_HEADER } }
        ).andReturnInvalidData();
      });

      it('should return 404 with a message', async () => {
        await mockRouter.callRoute(mockRequest);

        expect(mockRouter.response.notFound).toHaveBeenCalledWith({
          body: 'cannot-connect',
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Cannot connect to App Search: Error: Invalid data received from App Search: {"foo":"bar"}'
        );
        expect(mockLogger.debug).toHaveBeenCalled();
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { query: { type: 'meta', pageIndex: 5 } };
        mockRouter.shouldValidate(request);
      });

      it('wrong pageIndex type', () => {
        const request = { query: { type: 'indexed', pageIndex: 'indexed' } };
        mockRouter.shouldThrow(request);
      });

      it('wrong type string', () => {
        const request = { query: { type: 'invalid', pageIndex: 1 } };
        mockRouter.shouldThrow(request);
      });

      it('missing pageIndex', () => {
        const request = { query: { type: 'indexed' } };
        mockRouter.shouldThrow(request);
      });

      it('missing type', () => {
        const request = { query: { pageIndex: 1 } };
        mockRouter.shouldThrow(request);
      });
    });

    const AppSearchAPI = {
      shouldBeCalledWith(expectedUrl: string, expectedParams: object) {
        return {
          andReturn(response: object) {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.resolve(new Response(JSON.stringify(response)));
            });
          },
          andReturnInvalidData() {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.resolve(new Response(JSON.stringify({ foo: 'bar' })));
            });
          },
          andReturnError() {
            fetchMock.mockImplementation((url: string, params: object) => {
              expect(url).toEqual(expectedUrl);
              expect(params).toEqual(expectedParams);

              return Promise.reject('Failed');
            });
          },
        };
      },
    };
  });
});
