/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockConfig, mockLogger } from '../__mocks__';

import { createAppSearchRequestHandler } from './app_search_request_handler';

jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

describe('createAppSearchRequestHandler', () => {
  const responseMock = {
    ok: jest.fn(),
    notFound: jest.fn(),
    customError: jest.fn(),
  };

  beforeEach(() => {
    responseMock.ok.mockClear();
    responseMock.notFound.mockClear();
    responseMock.customError.mockClear();
    fetchMock.mockReset();
  });
  it('makes an API call and returns the response', async () => {
    const appSearchAPIResponseBody = {
      results: [{ name: 'engine1' }],
      meta: { page: { total_results: 1 } },
    };
    const KibanaAuthHeader = 'Basic 123';

    AppSearchAPI.shouldReturn(appSearchAPIResponseBody);

    const requestHandler = createAppSearchRequestHandler({
      config: mockConfig,
      log: mockLogger,
      path: '/as/credentials/collection',
      hasValidData: (body) => {
        return Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number';
      },
    });

    await requestHandler(
      null,
      {
        headers: {
          authorization: KibanaAuthHeader,
        },
        query: {
          type: 'indexed',
          pageIndex: 1,
        },
      },
      responseMock
    );

    AppSearchAPI.shouldHaveBeenCalledWith(
      'http://localhost:3002/as/credentials/collection?type=indexed&pageIndex=1',
      {
        headers: { Authorization: KibanaAuthHeader },
      }
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: appSearchAPIResponseBody,
    });
  });

  describe('when an API request fails', () => {
    it('should return 404 with a message', async () => {
      const KibanaAuthHeader = 'Basic 123';

      AppSearchAPI.shouldReturnError();

      const requestHandler = createAppSearchRequestHandler({
        config: mockConfig,
        log: mockLogger,
        path: '/as/credentials/collection',
        hasValidData: (body) => {
          return (
            Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number'
          );
        },
      });

      await requestHandler(
        null,
        {
          headers: {
            authorization: KibanaAuthHeader,
          },
        },
        responseMock
      );

      AppSearchAPI.shouldHaveBeenCalledWith(`http://localhost:3002/as/credentials/collection?`, {
        headers: { Authorization: KibanaAuthHeader },
      });

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting or fetching data from Enterprise Search',
        statusCode: 502,
      });
    });
  });

  describe('when `hasValidData` fails', () => {
    it('should return 404 with a message', async () => {
      const appSearchAPIResponseBody = {
        foo: 'bar',
      };
      const KibanaAuthHeader = 'Basic 123';

      AppSearchAPI.shouldReturn(appSearchAPIResponseBody);

      const requestHandler = createAppSearchRequestHandler({
        config: mockConfig,
        log: mockLogger,
        path: '/as/credentials/collection',
        hasValidData: (body) => {
          return (
            Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number'
          );
        },
      });

      await requestHandler(
        null,
        {
          headers: {
            authorization: KibanaAuthHeader,
          },
          query: {
            type: 'indexed',
            pageIndex: 1,
          },
        },
        responseMock
      );

      AppSearchAPI.shouldHaveBeenCalledWith(
        `http://localhost:3002/as/credentials/collection?type=indexed&pageIndex=1`,
        {
          headers: { Authorization: KibanaAuthHeader },
        }
      );

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting or fetching data from Enterprise Search',
        statusCode: 502,
      });
    });
  });
});

const AppSearchAPI = {
  shouldHaveBeenCalledWith(expectedUrl: string, expectedParams: object) {
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expectedParams);
  },
  shouldReturn(response: object) {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify(response)));
    });
  },
  shouldReturnError() {
    fetchMock.mockImplementation(() => {
      return Promise.reject('Failed');
    });
  },
};
