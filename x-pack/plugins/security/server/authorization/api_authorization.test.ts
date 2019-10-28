/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initAPIAuthorization } from './api_authorization';

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { authorizationMock } from './index.mock';

describe('initAPIAuthorization', () => {
  test(`route that doesn't start with "/api/" continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    initAPIAuthorization(
      mockHTTPSetup,
      authorizationMock.create(),
      loggingServiceMock.create().get()
    );

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({ method: 'get', path: '/app/foo' });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
  });

  test(`protected route that starts with "/api/", but "mode.useRbacForRequest()" returns false continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create();
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingServiceMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/api/foo',
      routeTags: ['access:foo'],
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    mockAuthz.mode.useRbacForRequest.mockReturnValue(false);

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`unprotected route that starts with "/api/", but "mode.useRbacForRequest()" returns true continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create();
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingServiceMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/api/foo',
      routeTags: ['not-access:foo'],
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route that starts with "/api/", "mode.useRbacForRequest()" returns true and user is authorized continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingServiceMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/api/foo',
      headers,
      routeTags: ['access:foo'],
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: true });
    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
    mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation(request => {
      // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
      // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
      expect(request.headers).toMatchObject(headers);

      return mockCheckPrivileges;
    });

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockAuthz.actions.api.get('foo')]);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route that starts with "/api/", "mode.useRbacForRequest()" returns true and user isn't authorized responds with a 404`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingServiceMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/api/foo',
      headers,
      routeTags: ['access:foo'],
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: false });
    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
    mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation(request => {
      // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
      // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
      expect(request.headers).toMatchObject(headers);

      return mockCheckPrivileges;
    });

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).toHaveBeenCalledTimes(1);
    expect(mockPostAuthToolkit.next).not.toHaveBeenCalled();
    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockAuthz.actions.api.get('foo')]);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });
});
