/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockConfig, mockLogger } from '../__mocks__';

import { EnterpriseSearchRequestHandler } from './enterprise_search_request_handler';

jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

const responseMock = {
  ok: jest.fn(),
  customError: jest.fn(),
};
const KibanaAuthHeader = 'Basic 123';

describe('EnterpriseSearchRequestHandler', () => {
  const enterpriseSearchRequestHandler = new EnterpriseSearchRequestHandler({
    config: mockConfig,
    log: mockLogger,
  }) as any;

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

    const requestHandler = enterpriseSearchRequestHandler.createRequest({
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

  it('allows passing custom params', async () => {
    const responseBody = {
      results: [{ name: 'engine1' }],
      meta: { page: { total_results: 1 } },
    };
    EnterpriseSearchAPI.mockReturn(responseBody);

    const requestHandler = enterpriseSearchRequestHandler.createRequest({
      path: '/as/engines/collection',
      params: '?some=custom&params=true',
    });
    await makeAPICall(requestHandler, { query: { overriden: true } });

    EnterpriseSearchAPI.shouldHaveBeenCalledWith(
      'http://localhost:3002/as/engines/collection?some=custom&params=true'
    );
    expect(responseMock.ok).toHaveBeenCalledWith({
      body: responseBody,
    });
  });

  describe('error handling', () => {
    afterEach(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error connecting to Enterprise Search')
      );
    });

    it('returns an error when an API request fails', async () => {
      EnterpriseSearchAPI.mockReturnError();
      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/failed' });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/failed');

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting to Enterprise Search: Failed',
        statusCode: 502,
      });
    });

    it('returns an error when `hasValidData` fails', async () => {
      EnterpriseSearchAPI.mockReturn({ results: false });
      const requestHandler = enterpriseSearchRequestHandler.createRequest({
        path: '/api/invalid',
        hasValidData: (body?: any) => Array.isArray(body?.results),
      });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/invalid');

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting to Enterprise Search: Invalid data received',
        statusCode: 502,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Invalid data received from <http://localhost:3002/api/invalid>: {"results":false}'
      );
    });

    it('returns an error when user authentication to Enterprise Search fails', async () => {
      EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/login' });
      const requestHandler = enterpriseSearchRequestHandler.createRequest({
        path: '/api/unauthenticated',
      });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/unauthenticated');

      expect(responseMock.customError).toHaveBeenCalledWith({
        body: 'Error connecting to Enterprise Search: Cannot authenticate Enterprise Search user',
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
  mockReturn(response: object, options?: object) {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify(response), options));
    });
  },
  mockReturnError() {
    fetchMock.mockImplementation(() => {
      return Promise.reject('Failed');
    });
  },
};
