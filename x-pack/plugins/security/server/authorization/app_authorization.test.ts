/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { PluginSetupContract as FeaturesSetupContract } from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import { initAppAuthorization } from './app_authorization';
import { authorizationMock } from './index.mock';

const createFeaturesSetupContractMock = (): FeaturesSetupContract => {
  const mock = featuresPluginMock.createSetup();
  mock.getKibanaFeatures.mockReturnValue([
    { id: 'foo', name: 'Foo', app: ['foo'], privileges: {} } as any,
  ]);
  return mock;
};

describe('initAppAuthorization', () => {
  test(`route that doesn't start with "/app/" continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    initAppAuthorization(
      mockHTTPSetup,
      authorizationMock.create(),
      loggingSystemMock.create().get(),
      createFeaturesSetupContractMock()
    );

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({ method: 'get', path: '/api/foo' });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
  });

  test(`protected route that starts with "/app/", but "mode.useRbacForRequest()" returns false continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create();
    initAppAuthorization(
      mockHTTPSetup,
      mockAuthz,
      loggingSystemMock.create().get(),
      createFeaturesSetupContractMock()
    );

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({ method: 'get', path: '/app/foo' });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    mockAuthz.mode.useRbacForRequest.mockReturnValue(false);

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`unprotected route that starts with "/app/", and "mode.useRbacForRequest()" returns true continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create();
    initAppAuthorization(
      mockHTTPSetup,
      mockAuthz,
      loggingSystemMock.create().get(),
      createFeaturesSetupContractMock()
    );

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({ method: 'get', path: '/app/bar' });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route that starts with "/app/", "mode.useRbacForRequest()" returns true and user is authorized continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });

    initAppAuthorization(
      mockHTTPSetup,
      mockAuthz,
      loggingSystemMock.create().get(),
      createFeaturesSetupContractMock()
    );

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/app/foo',
      headers,
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: true });
    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
    mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
      // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
      // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
      expect(request.headers).toMatchObject(headers);

      return mockCheckPrivileges;
    });

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.notFound).not.toHaveBeenCalled();
    expect(mockPostAuthToolkit.next).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivileges).toHaveBeenCalledWith({ kibana: mockAuthz.actions.app.get('foo') });
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route that starts with "/app/", "mode.useRbacForRequest()" returns true and user isn't authorized responds with a 404`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });

    initAppAuthorization(
      mockHTTPSetup,
      mockAuthz,
      loggingSystemMock.create().get(),
      createFeaturesSetupContractMock()
    );

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/app/foo',
      headers,
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: false });
    mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
    mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
      // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
      // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
      expect(request.headers).toMatchObject(headers);

      return mockCheckPrivileges;
    });

    await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

    expect(mockResponse.forbidden).toHaveBeenCalledTimes(1);
    expect(mockPostAuthToolkit.next).not.toHaveBeenCalled();
    expect(mockCheckPrivileges).toHaveBeenCalledWith({ kibana: mockAuthz.actions.app.get('foo') });
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });
});
