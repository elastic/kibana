/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockConfig, mockLogger } from '../__mocks__';

import {
  ENTERPRISE_SEARCH_KIBANA_COOKIE,
  JSON_HEADER,
  READ_ONLY_MODE_HEADER,
} from '../../common/constants';

import { EnterpriseSearchRequestHandler } from './enterprise_search_request_handler';

jest.mock('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

const { Response } = jest.requireActual('node-fetch');

const responseMock = {
  custom: jest.fn(),
  customError: jest.fn(),
};
const mockExpectedResponseHeaders = {
  [READ_ONLY_MODE_HEADER]: 'false',
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
        headers: mockExpectedResponseHeaders,
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

      it('passes a body if that body is a string buffer', async () => {
        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/example',
        });
        await makeAPICall(requestHandler, { body: Buffer.from('{"bodacious":true}') });

        EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/example', {
          body: '{"bodacious":true}',
        });
      });

      it('passes request params', async () => {
        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/example',
        });
        await makeAPICall(requestHandler, { query: { someQuery: false } });

        EnterpriseSearchAPI.shouldHaveBeenCalledWith(
          'http://localhost:3002/api/example?someQuery=false'
        );
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

      it('correctly encodes query string parameters', async () => {
        const requestHandler = enterpriseSearchRequestHandler.createRequest({
          path: '/api/example',
        });
        await makeAPICall(requestHandler, { query: { 'page[current]': 1 } });

        EnterpriseSearchAPI.shouldHaveBeenCalledWith(
          'http://localhost:3002/api/example?page%5Bcurrent%5D=1'
        );
      });

      describe('encodePathParams', () => {
        it('correctly replaces :pathVariables with request.params', async () => {
          const requestHandler = enterpriseSearchRequestHandler.createRequest({
            path: '/api/examples/:example/some/:id',
          });
          await makeAPICall(requestHandler, { params: { example: 'hello', id: 'world' } });

          EnterpriseSearchAPI.shouldHaveBeenCalledWith(
            'http://localhost:3002/api/examples/hello/some/world'
          );
        });

        it('correctly encodes path params as URI components', async () => {
          const requestHandler = enterpriseSearchRequestHandler.createRequest({
            path: '/api/examples/:example',
          });
          await makeAPICall(requestHandler, { params: { example: 'hello#@/$%^/&[]{}/";world' } });

          EnterpriseSearchAPI.shouldHaveBeenCalledWith(
            'http://localhost:3002/api/examples/hello%23%40%2F%24%25%5E%2F%26%5B%5D%7B%7D%2F%22%3Bworld'
          );
        });
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
        expect(responseMock.custom).toHaveBeenCalledWith({
          body: {},
          statusCode: 201,
          headers: mockExpectedResponseHeaders,
        });
      });

      it('filters out any _sessionData passed back from Enterprise Search', async () => {
        const jsonWithSessionData = {
          _sessionData: {
            secrets: 'no peeking',
          },
          regular: 'data',
        };

        EnterpriseSearchAPI.mockReturn(jsonWithSessionData, { headers: JSON_HEADER });

        const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/prep' });
        await makeAPICall(requestHandler);

        expect(responseMock.custom).toHaveBeenCalledWith({
          statusCode: 200,
          body: {
            regular: 'data',
          },
          headers: mockExpectedResponseHeaders,
        });
      });
    });

    it('works if response contains no json data', async () => {
      EnterpriseSearchAPI.mockReturn();

      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/prep' });
      await makeAPICall(requestHandler);

      expect(responseMock.custom).toHaveBeenCalledWith({
        statusCode: 200,
        headers: mockExpectedResponseHeaders,
      });
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
          headers: mockExpectedResponseHeaders,
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
          headers: mockExpectedResponseHeaders,
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
          headers: mockExpectedResponseHeaders,
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
          headers: mockExpectedResponseHeaders,
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
          headers: mockExpectedResponseHeaders,
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
        headers: mockExpectedResponseHeaders,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Enterprise Search Server Error 500 at <http://localhost:3002/api/5xx>: "something crashed!"'
      );
    });

    it('handleReadOnlyModeError()', async () => {
      EnterpriseSearchAPI.mockReturn(
        { errors: ['Read only mode'] },
        { status: 503, headers: { ...JSON_HEADER, [READ_ONLY_MODE_HEADER]: 'true' } }
      );
      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/api/503' });

      await makeAPICall(requestHandler);
      EnterpriseSearchAPI.shouldHaveBeenCalledWith('http://localhost:3002/api/503');

      expect(responseMock.customError).toHaveBeenCalledWith({
        statusCode: 503,
        body: expect.stringContaining('Enterprise Search is in read-only mode'),
        headers: { [READ_ONLY_MODE_HEADER]: 'true' },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot perform action: Enterprise Search is in read-only mode. Actions that create, update, or delete information are disabled.'
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
        headers: mockExpectedResponseHeaders,
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
        headers: mockExpectedResponseHeaders,
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
          headers: mockExpectedResponseHeaders,
        });
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('errors when receiving a 401 response', async () => {
        EnterpriseSearchAPI.mockReturn({}, { status: 401 });
      });

      it('errors when redirected to /login', async () => {
        EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/login' });
      });

      it('errors when redirected to /ent/select', async () => {
        EnterpriseSearchAPI.mockReturn({}, { url: 'http://localhost:3002/ent/select' });
      });
    });
  });

  it('setResponseHeaders', async () => {
    EnterpriseSearchAPI.mockReturn('anything' as any, {
      headers: { [READ_ONLY_MODE_HEADER]: 'true' },
    });
    const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/' });
    await makeAPICall(requestHandler);

    expect(enterpriseSearchRequestHandler.headers).toEqual({
      [READ_ONLY_MODE_HEADER]: 'true',
    });
  });

  describe('setSessionData', () => {
    it('sets the value of wsOAuthTokenPackage in a cookie', async () => {
      const tokenPackage = 'some_encrypted_secrets';

      const mockNow = 'Thu, 04 Mar 2021 22:40:32 GMT';
      const mockInAnHour = 'Thu, 04 Mar 2021 23:40:32 GMT';
      jest.spyOn(global.Date, 'now').mockImplementationOnce(() => {
        return new Date(mockNow).valueOf();
      });

      const sessionDataBody = {
        _sessionData: { wsOAuthTokenPackage: tokenPackage },
        regular: 'data',
      };

      EnterpriseSearchAPI.mockReturn(sessionDataBody, { headers: JSON_HEADER });

      const requestHandler = enterpriseSearchRequestHandler.createRequest({ path: '/' });
      await makeAPICall(requestHandler);

      expect(enterpriseSearchRequestHandler.headers).toEqual({
        ['set-cookie']: `${ENTERPRISE_SEARCH_KIBANA_COOKIE}=${tokenPackage}; Path=/; Expires=${mockInAnHour}; SameSite=Lax; HttpOnly`,
        ...mockExpectedResponseHeaders,
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
  mockReturn(response?: object, options?: any) {
    fetchMock.mockImplementation(() => {
      const headers = Object.assign({}, mockExpectedResponseHeaders, options?.headers);
      return Promise.resolve(
        new Response(response ? JSON.stringify(response) : undefined, { ...options, headers })
      );
    });
  },
  mockReturnError() {
    fetchMock.mockImplementation(() => {
      return Promise.reject('Failed');
    });
  },
};
