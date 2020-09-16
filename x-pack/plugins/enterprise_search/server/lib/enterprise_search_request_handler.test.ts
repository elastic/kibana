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

  describe('createRequest()', () => {
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
        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/example',
        });

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
        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/example',
        });
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
        EnterpriseSearchAPI.mockReturn({}, { status: 201 });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/example',
        });
        await makeAPICall(requestHandler);

        EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/example');
        expect(responseMock.custom).toHaveBeenCalledWith({ body: {}, statusCode: 201 });
      });

      // TODO: It's possible we may also pass back headers at some point
      // from Enterprise Search, e.g. the x-read-only mode header
    });
  });

  describe('error responses', () => {
    describe('handleClientError()', () => {
      afterEach(() => {
        EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/4xx');
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it('passes back json.error', async () => {
        const error = 'some error message';
        EnterpriseSearchAPI.mockReturn({ error }, { status: 404, headers: JSON_HEADER });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/4xx' });
        await makeAPICall(requestHandler);

        expect(responseMock.customError).toHaveBeenCalledWith({
          statusCode: 404,
          body: {
            message: 'some error message',
            attributes: { errors: ['some error message'] },
          },
        });
      });

      it('passes back json.errors', async () => {
        const errors = ['one', 'two', 'three'];
        EnterpriseSearchAPI.mockReturn({ errors }, { status: 400, headers: JSON_HEADER });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/4xx' });
        await makeAPICall(requestHandler);

        expect(responseMock.customError).toHaveBeenCalledWith({
          statusCode: 400,
          body: {
            message: 'one,two,three',
            attributes: { errors: ['one', 'two', 'three'] },
          },
        });
      });

      it('handles empty json', async () => {
        EnterpriseSearchAPI.mockReturn({}, { status: 400, headers: JSON_HEADER });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/4xx' });
        await makeAPICall(requestHandler);

        expect(responseMock.customError).toHaveBeenCalledWith({
          statusCode: 400,
          body: {
            message: 'Bad Request',
            attributes: { errors: ['Bad Request'] },
          },
        });
      });

      it('handles invalid json', async () => {
        EnterpriseSearchAPI.mockReturn('invalid' as any, { status: 400, headers: JSON_HEADER });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/4xx' });
        await makeAPICall(requestHandler);

        expect(responseMock.customError).toHaveBeenCalledWith({
          statusCode: 400,
          body: {
            message: 'Bad Request',
            attributes: { errors: ['Bad Request'] },
          },
        });
      });

      it('handles blank bodies', async () => {
        EnterpriseSearchAPI.mockReturn(undefined as any, { status: 404 });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/4xx' });
        await makeAPICall(requestHandler);

        expect(responseMock.customError).toHaveBeenCalledWith({
          statusCode: 404,
          body: {
            message: 'Not Found',
            attributes: { errors: ['Not Found'] },
          },
        });
      });
    });

    it('handleServerError()', async () => {
      EnterpriseSearchAPI.mockReturn('something crashed!' as any, { status: 500 });
      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/5xx' });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/5xx');

      expect(responseMock.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: expect.stringContaining('Enterprise Search encountered an internal server error'),
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Enterprise Search Server Error 500 at <http://localhost:3002/api/5xx>: "something crashed!"'
      );
    });

    it('handleInvalidDataError()', async () => {
      EnterpriseSearchAPI.mockReturn({ results: false });
      const requestHandler = enterpriseSearchRequestHandler.createRequest({
        path: '/api/invalid',
        hasValidData: (body?: any) => Array.isArray(body?.results),
      });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/invalid');

      expect(responseMock.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: 'Invalid data received from Enterprise Search',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid data received from <http://localhost:3002/api/invalid>: {"results":false}'
      );
    });

    it('handleConnectionError()', async () => {
      EnterpriseSearchAPI.mockReturnError();
      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/failed' });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/failed');

      expect(responseMock.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: 'Error connecting to Enterprise Search: Failed',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    describe('handleAuthenticationError()', () => {
      afterEach(async () => {
        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/unauthenticated',
        });
        await makeAPICall(requestHandler);

        EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/unauthenticated');
        expect(responseMock.customError).toHaveBeenCalledWith({
          statusCode: 502,
          body: 'Cannot authenticate Enterprise Search user',
        });
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('errors when redirected to /login', async () => {
        EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/login' });
      });

      it('errors when redirected to /ent/select', async () => {
        EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/ent/select' });
      });
    });
  });

  it('isEmptyObj', async () => {
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
  mockReturnError() {
    fetchMock.mockImplementation(() => {
      return Promise.reject('Failed');
    });
  },
};
