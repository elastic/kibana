/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockConfig, mockLogger } from '../__mocks__';
import { JSON_HEADER } from '../../common/constants';

import { EnterpriseSearchRequestHandler } from './enterprise_search_request_handler';

jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;
const { Response } = jest.requireActual('node-fetch');

const responseMock = {
  custom: jest.fn(),
  customError: jest.fn(),
};

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
      'http://localhost:3002/as/credentials/collection?type=indexed&pageIndex=1',
      { method: 'GET' }
    );

    expect(responseMock.custom).toHaveBeenCalledWith({
      body: responseBody,
      statusCode: 200,
    });
  });

  describe('request passing', () => {
    it('passes route method', async () => {
      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/example' });

      await makeAPICall(requestHandler, { route: { method: 'POST' } });
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/example', {
        method: 'POST',
      });

      await makeAPICall(requestHandler, { route: { method: 'DELETE' } });
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/example', {
        method: 'DELETE',
      });
    });

    it('passes request body', async () => {
      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/example' });
      await makeAPICall(requestHandler, { body: { bodacious: true } });

      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/example', {
        body: '{"bodacious":true}',
      });
    });

    it('passes custom params set by the handler, which override request params', async () => {
      const requestHandler = enterpriseSearchRequestHandler.createRequest({
        path: '/api/example',
        params: { someQuery: true },
      });
      await makeAPICall(requestHandler, { query: { someQuery: false } });

      EnterpriseSearchAPI.shouldHaveBeenCalledWith(
        'http://localhost:3002/api/example?someQuery=true'
      );
    });
  });

  describe('response passing', () => {
    it('returns the response status code from Enterprise Search', async () => {
      EnterpriseSearchAPI.mockReturn({}, { status: 404 });

      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/example' });
      await makeAPICall(requestHandler);

      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/example');
      expect(responseMock.custom).toHaveBeenCalledWith({ body: {}, statusCode: 404 });
    });

    // TODO: It's possible we may also pass back headers at some point
    // from Enterprise Search, e.g. the x-read-only mode header
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

    it('returns a helpful error if server responds with something other than json', async () => {
      EnterpriseSearchAPI.mockTextReturn('I am just a text body');
      const requestHandler = enterpriseSearchRequestHandler.createRequest({
        path: '/api/invalid',
      });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/invalid');

      expect(responseMock.customError).toHaveBeenCalledWith({
        body:
          "Error connecting to Enterprise Search: Server responded with invalid json. Status code was: 200. Body was 'I am just a text body'",
        statusCode: 502,
      });
    });

    describe('user authentication errors', () => {
      afterEach(async () => {
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

      it('errors when redirected to /login', async () => {
        EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/login' });
      });

      it('errors when redirected to /ent/select', async () => {
        EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/ent/select' });
      });
    });
  });

  it('has a helper for checking empty objects', async () => {
    expect(enterpriseSearchRequestHandler.isEmptyObj({})).toEqual(true);
    expect(enterpriseSearchRequestHandler.isEmptyObj({ empty: false })).toEqual(false);
  });
});

const makeAPICall = (handler: Function, params = {}) => {
  const request = {
    headers: { authorization: 'Basic 123' },
    route: { method: 'GET' },
    body: {},
    ...params,
  };
  return handler(null, request, responseMock);
};

const EnterpriseSearchAPI = {
  shouldHaveBeenCalledWith(expectedUrl: string, expectedParams = {}) {
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
      headers: { Authorization: 'Basic 123', ...JSON_HEADER },
      method: 'GET',
      body: undefined,
      ...expectedParams,
    });
  },
  mockReturn(response: object, options?: object) {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify(response), options));
    });
  },
  mockTextReturn(response: string, options?: object) {
    fetchMock.mockImplementation(() => {
      return Promise.resolve(new Response(response, options));
    });
  },
  mockReturnError() {
    fetchMock.mockImplementation(() => {
      return Promise.reject('Failed');
    });
  },
};
