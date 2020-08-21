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

const responseMock = {
  ok: jest.fn(),
  notFound: jest.fn(),
  customError: jest.fn(),
};
const KibanaAuthHeader = 'Basic 123';

describe('createAppSearchRequestHandler', () => {
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

    AppSearchAPI.mockReturn(appSearchAPIResponseBody);

    const requestHandler = createAppSearchRequestHandler({
      config: mockConfig,
      log: mockLogger,
      path: '/as/credentials/collection',
    });

    await makeAPICall(requestHandler, {
      query: {
        type: 'indexed',
        pageIndex: 1,
      },
    });

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
      AppSearchAPI.mockReturnError();

      const requestHandler = createAppSearchRequestHandler({
        config: mockConfig,
        log: mockLogger,
        path: '/as/credentials/collection',
      });

      await makeAPICall(requestHandler);

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

      AppSearchAPI.mockReturn(appSearchAPIResponseBody);

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

      await makeAPICall(requestHandler);

      AppSearchAPI.shouldHaveBeenCalledWith(`http://localhost:3002/as/credentials/collection?`, {
        headers: { Authorization: KibanaAuthHeader },
      });

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting or fetching data from Enterprise Search',
        statusCode: 502,
      });
    });
  });
});

const makeAPICall = (handler, params = {}) => {
  return handler(
    null,
    {
      headers: {
        authorization: KibanaAuthHeader,
      },
      ...params,
    },
    responseMock
  );
};

const AppSearchAPI = {
  shouldHaveBeenCalledWith(expectedUrl: string, expectedParams: object) {
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expectedParams);
  },
  mockReturn(response: object) {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify(response)));
    });
  },
  mockReturnError() {
    fetchMock.mockImplementation(() => {
      return Promise.reject('Failed');
    });
  },
};
