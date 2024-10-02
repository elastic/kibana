/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import { initAPIAuthorization } from './api_authorization';
import { authorizationMock } from './index.mock';

describe('initAPIAuthorization', () => {
  test(`protected route when "mode.useRbacForRequest()" returns false continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create();
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
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

  test(`unprotected route when "mode.useRbacForRequest()" returns true continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create();
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
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

  test(`protected route when "mode.useRbacForRequest()" returns true and user is authorized continues`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
      headers,
      routeTags: ['access:foo'],
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
    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      kibana: [mockAuthz.actions.api.get('foo')],
    });
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  test(`protected route when "mode.useRbacForRequest()" returns true and user isn't authorized responds with a 403`, async () => {
    const mockHTTPSetup = coreMock.createSetup().http;
    const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });
    initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

    const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

    const headers = { authorization: 'foo' };
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/foo/bar',
      headers,
      routeTags: ['access:foo'],
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
    expect(mockCheckPrivileges).toHaveBeenCalledWith({
      kibana: [mockAuthz.actions.api.get('foo')],
    });
    expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);
  });

  describe('security config', () => {
    const testSecurityConfig = (
      description: string,
      {
        security,
        kibanaPrivilegesResponse,
        kibanaPrivilegesRequestActions,
        asserts,
      }: {
        security?: RouteSecurity;
        kibanaPrivilegesResponse?: Array<{ privilege: string; authorized: boolean }>;
        kibanaPrivilegesRequestActions?: string[];
        asserts: {
          forbidden?: boolean;
          authzResult?: Record<string, boolean>;
          authzDisabled?: boolean;
        };
      }
    ) => {
      test(description, async () => {
        const mockHTTPSetup = coreMock.createSetup().http;
        const mockAuthz = authorizationMock.create({ version: '1.0.0-zeta1' });
        initAPIAuthorization(mockHTTPSetup, mockAuthz, loggingSystemMock.create().get());

        const [[postAuthHandler]] = mockHTTPSetup.registerOnPostAuth.mock.calls;

        const headers = { authorization: 'foo' };

        const mockRequest = httpServerMock.createKibanaRequest({
          method: 'get',
          path: '/foo/bar',
          headers,
          kibanaRouteOptions: {
            xsrfRequired: true,
            access: 'internal',
            security,
          },
        });
        const mockResponse = httpServerMock.createResponseFactory();
        const mockPostAuthToolkit = httpServiceMock.createOnPostAuthToolkit();

        const mockCheckPrivileges = jest.fn().mockReturnValue({
          privileges: {
            kibana: kibanaPrivilegesResponse,
          },
        });
        mockAuthz.mode.useRbacForRequest.mockReturnValue(true);
        mockAuthz.checkPrivilegesDynamicallyWithRequest.mockImplementation((request) => {
          // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
          // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
          expect(request.headers).toMatchObject(headers);

          return mockCheckPrivileges;
        });

        await postAuthHandler(mockRequest, mockResponse, mockPostAuthToolkit);

        expect(mockAuthz.mode.useRbacForRequest).toHaveBeenCalledWith(mockRequest);

        if (asserts.authzDisabled) {
          expect(mockResponse.forbidden).not.toHaveBeenCalled();
          expect(mockPostAuthToolkit.authzResultNext).not.toHaveBeenCalled();
          expect(mockPostAuthToolkit.next).toHaveBeenCalled();
          expect(mockCheckPrivileges).not.toHaveBeenCalled();

          return;
        }

        expect(mockCheckPrivileges).toHaveBeenCalledWith({
          kibana: kibanaPrivilegesRequestActions!.map((action: string) =>
            mockAuthz.actions.api.get(action)
          ),
        });

        if (asserts.forbidden) {
          expect(mockResponse.forbidden).toHaveBeenCalled();
          expect(mockPostAuthToolkit.authzResultNext).not.toHaveBeenCalled();
        }

        if (asserts.authzResult) {
          expect(mockResponse.forbidden).not.toHaveBeenCalled();
          expect(mockPostAuthToolkit.authzResultNext).toHaveBeenCalledTimes(1);
          expect(mockPostAuthToolkit.authzResultNext).toHaveBeenCalledWith(asserts.authzResult);
        }
      });
    };

    testSecurityConfig(
      `protected route returns "authzResult" if user has allRequired AND anyRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1'],
                anyRequired: ['privilege2', 'privilege3'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: true },
          { privilege: 'api:privilege2', authorized: true },
          { privilege: 'api:privilege3', authorized: false },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: true,
            privilege3: false,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has all required privileges requested as complex config`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1', 'privilege2'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: true },
          { privilege: 'api:privilege2', authorized: true },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has at least one of anyRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                anyRequired: ['privilege1', 'privilege2', 'privilege3'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: false },
          { privilege: 'api:privilege2', authorized: true },
          { privilege: 'api:privilege3', authorized: false },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3'],
        asserts: {
          authzResult: {
            privilege1: false,
            privilege2: true,
            privilege3: false,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns "authzResult" if user has all required privileges requested as simple config`,
      {
        security: {
          authz: {
            requiredPrivileges: ['privilege1', 'privilege2'],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: true },
          { privilege: 'api:privilege2', authorized: true },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2'],
        asserts: {
          authzResult: {
            privilege1: true,
            privilege2: true,
          },
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user has allRequired AND NONE of anyRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1'],
                anyRequired: ['privilege2', 'privilege3'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: true },
          { privilege: 'api:privilege2', authorized: false },
          { privilege: 'api:privilege3', authorized: false },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have at least one from allRequired privileges requested`,
      {
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1', 'privilege2'],
                anyRequired: ['privilege3', 'privilege4'],
              },
            ],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: true },
          { privilege: 'api:privilege2', authorized: false },
          { privilege: 'api:privilege3', authorized: false },
          { privilege: 'api:privilege4', authorized: true },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2', 'privilege3', 'privilege4'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(
      `protected route returns forbidden if user doesn't have at least one from required privileges requested as simple config`,
      {
        security: {
          authz: {
            requiredPrivileges: ['privilege1', 'privilege2'],
          },
        },
        kibanaPrivilegesResponse: [
          { privilege: 'api:privilege1', authorized: true },
          { privilege: 'api:privilege2', authorized: false },
        ],
        kibanaPrivilegesRequestActions: ['privilege1', 'privilege2'],
        asserts: {
          forbidden: true,
        },
      }
    );

    testSecurityConfig(`route returns next if route has authz disabled`, {
      security: {
        authz: {
          enabled: false,
          reason: 'authz is disabled',
        },
      },
      asserts: {
        authzDisabled: true,
      },
    });
  });
});
