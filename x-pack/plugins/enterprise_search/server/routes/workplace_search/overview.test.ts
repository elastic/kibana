/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockConfig, mockLogger } from '../__mocks__';

import { registerWSOverviewRoute } from './overview';

jest.mock('node-fetch');
const fetch = jest.requireActual('node-fetch');
const { Response } = fetch;
const fetchMock = require('node-fetch') as jest.Mocked<typeof fetch>;

const ORG_ROUTE = 'http://localhost:3002/ws/org';

describe('engine routes', () => {
  describe('GET /api/workplace_search/overview', () => {
    const AUTH_HEADER = 'Basic 123';
    const mockRequest = {
      headers: {
        authorization: AUTH_HEADER,
      },
      query: {},
    };

    const mockRouter = new MockRouter({ method: 'get', payload: 'query' });

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter.createRouter();

      registerWSOverviewRoute({
        router: mockRouter.router,
        log: mockLogger,
        config: mockConfig,
      });
    });

    describe('when the underlying Workplace Search API returns a 200', () => {
      beforeEach(() => {
        WorkplaceSearchAPI.shouldBeCalledWith(ORG_ROUTE, {
          headers: { Authorization: AUTH_HEADER },
        }).andReturn({ accountsCount: 1 });
      });

      it('should return 200 with a list of overview from the Workplace Search API', async () => {
        await mockRouter.callRoute(mockRequest);

        expect(mockRouter.response.ok).toHaveBeenCalledWith({
          body: { accountsCount: 1 },
          headers: { 'content-type': 'application/json' },
        });
      });
    });

    describe('when the Workplace Search URL is invalid', () => {
      beforeEach(() => {
        WorkplaceSearchAPI.shouldBeCalledWith(ORG_ROUTE, {
          headers: { Authorization: AUTH_HEADER },
        }).andReturnError();
      });

      it('should return 404 with a message', async () => {
        await mockRouter.callRoute(mockRequest);

        expect(mockRouter.response.notFound).toHaveBeenCalledWith({
          body: 'cannot-connect',
        });
        expect(mockLogger.error).toHaveBeenCalledWith('Cannot connect to Workplace Search: Failed');
        expect(mockLogger.debug).not.toHaveBeenCalled();
      });
    });

    describe('when the Workplace Search API returns invalid data', () => {
      beforeEach(() => {
        WorkplaceSearchAPI.shouldBeCalledWith(ORG_ROUTE, {
          headers: { Authorization: AUTH_HEADER },
        }).andReturnInvalidData();
      });

      it('should return 404 with a message', async () => {
        await mockRouter.callRoute(mockRequest);

        expect(mockRouter.response.notFound).toHaveBeenCalledWith({
          body: 'cannot-connect',
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Cannot connect to Workplace Search: Error: Invalid data received from Workplace Search: {"foo":"bar"}'
        );
        expect(mockLogger.debug).toHaveBeenCalled();
      });
    });

    const WorkplaceSearchAPI = {
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
