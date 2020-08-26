/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockConfig, mockLogger } from '../__mocks__';

import { createEnterpriseSearchRequestHandler } from './enterprise_search_request_handler';

jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

const responseMock = {
  ok: jest.fn(),
  customError: jest.fn(),
};
const KibanaAuthHeader = 'Basic 123';

describe('createEnterpriseSearchRequestHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
  });

  it('makes an API call and returns the response', async () => {
    const responseBody = {
      results: [{ name: 'engine1' }],
      meta: { page: { total_results: 1 } },
    };

    EnterpriseSearchAPI.mockReturn(responseBody);

    const requestHandler = createEnterpriseSearchRequestHandler({
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

    EnterpriseSearchAPI.shouldHaveBeenCalledWith(
      'http://localhost:3002/as/credentials/collection?type=indexed&pageIndex=1'
    );

    expect(responseMock.ok).toHaveBeenCalledWith({
      body: responseBody,
    });
  });

  describe('when an API request fails', () => {
    it('should return 502 with a message', async () => {
      EnterpriseSearchAPI.mockReturnError();

      const requestHandler = createEnterpriseSearchRequestHandler({
        config: mockConfig,
        log: mockLogger,
        path: '/as/credentials/collection',
      });

      await makeAPICall(requestHandler);

      EnterpriseSearchAPI.shouldHaveBeenCalledWith(
        'http://localhost:3002/as/credentials/collection'
      );

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting or fetching data from Enterprise Search',
        statusCode: 502,
      });
    });
  });

  describe('when `hasValidData` fails', () => {
    it('should return 502 with a message', async () => {
      const responseBody = {
        foo: 'bar',
      };

      EnterpriseSearchAPI.mockReturn(responseBody);

      const requestHandler = createEnterpriseSearchRequestHandler({
        config: mockConfig,
        log: mockLogger,
        path: '/as/credentials/collection',
        hasValidData: (body?: any) =>
          Array.isArray(body?.results) && typeof body?.meta?.page?.total_results === 'number',
      });

      await makeAPICall(requestHandler);

      EnterpriseSearchAPI.shouldHaveBeenCalledWith(
        'http://localhost:3002/as/credentials/collection'
      );

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting or fetching data from Enterprise Search',
        statusCode: 502,
      });
    });
  });
});

const makeAPICall = (handler: Function, params = {}) => {
  const request = { headers: { authorization: KibanaAuthHeader }, ...params };
  return handler(null, request, responseMock);
};

const EnterpriseSearchAPI = {
  shouldHaveBeenCalledWith(expectedUrl: string, expectedParams = {}) {
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
      headers: { Authorization: KibanaAuthHeader },
      ...expectedParams,
    });
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
