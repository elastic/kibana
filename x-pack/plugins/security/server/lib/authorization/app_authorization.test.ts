/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { AuthorizationService } from './service';

import { Feature } from '../../../../xpack_main/types';
import { XPackMainPlugin } from '../../../../xpack_main/xpack_main';
import { actionsFactory } from './actions';
import { initAppAuthorization } from './app_authorization';

const actions = actionsFactory({
  get(key: string) {
    if (key === 'pkg.version') {
      return `1.0.0-zeta1`;
    }

    throw new Error(`Unexpected config key: ${key}`);
  },
});

const createMockXPackMainPlugin = (): XPackMainPlugin => {
  const features: Feature[] = [
    {
      id: 'foo',
      name: 'Foo',
      app: ['foo'],
      privileges: {},
    },
  ];
  return {
    getFeatures: () => features,
  } as XPackMainPlugin;
};

describe('initAppAuthorization', () => {
  test(`route that doesn't start with "/app/" continues`, async () => {
    const server = new Server();
    initAppAuthorization(server, createMockXPackMainPlugin(), {} as AuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/api/foo',
        handler: () => {
          return 'foo app response';
        },
      },
    ]);
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/api/foo',
    });
    expect(result).toBe('foo app response');
    expect(statusCode).toBe(200);
  });

  test(`protected route that starts with "/app/", but "mode.useRbacForRequest()" returns false continues`, async () => {
    const server = new Server();
    const mockAuthorizationService: AuthorizationService = {
      mode: {
        useRbacForRequest: jest.fn().mockReturnValue(false),
      },
    } as any;
    initAppAuthorization(server, createMockXPackMainPlugin(), mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/app/foo',
        handler: () => {
          return 'foo app response';
        },
      },
    ]);
    const { request, result, statusCode } = await server.inject({
      method: 'GET',
      url: '/app/foo',
    });
    expect(result).toBe('foo app response');
    expect(statusCode).toBe(200);
    expect(mockAuthorizationService.mode.useRbacForRequest).toHaveBeenCalledWith(request);
  });

  test(`unprotected route that starts with "/app/", and "mode.useRbacForRequest()" returns true continues`, async () => {
    const server = new Server();
    const mockAuthorizationService: AuthorizationService = {
      actions,
      mode: {
        useRbacForRequest: jest.fn().mockReturnValue(true),
      },
    } as any;
    initAppAuthorization(server, createMockXPackMainPlugin(), mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/app/bar',
        handler: () => {
          return 'bar app response';
        },
      },
    ]);
    const { request, result, statusCode } = await server.inject({
      method: 'GET',
      url: '/app/bar',
    });
    expect(result).toBe('bar app response');
    expect(statusCode).toBe(200);
    expect(mockAuthorizationService.mode.useRbacForRequest).toHaveBeenCalledWith(request);
  });

  test(`protected route that starts with "/app/", "mode.useRbacForRequest()" returns true and user is authorized continues`, async () => {
    const headers = {
      authorization: 'foo',
    };
    const server = new Server();
    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: true });
    const mockAuthorizationService: AuthorizationService = {
      actions,
      checkPrivilegesDynamicallyWithRequest: (req: any) => {
        // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
        // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
        expect(req.headers).toMatchObject(headers);

        return mockCheckPrivileges;
      },
      mode: {
        useRbacForRequest: jest.fn().mockReturnValue(true),
      },
    } as any;
    initAppAuthorization(server, createMockXPackMainPlugin(), mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/app/foo',
        handler: () => {
          return 'foo app response';
        },
      },
    ]);
    const { request, result, statusCode } = await server.inject({
      method: 'GET',
      url: '/app/foo',
      headers,
    });
    expect(result).toBe('foo app response');
    expect(statusCode).toBe(200);
    expect(mockCheckPrivileges).toHaveBeenCalledWith(actions.app.get('foo'));
    expect(mockAuthorizationService.mode.useRbacForRequest).toHaveBeenCalledWith(request);
  });

  test(`protected route that starts with "/app/", "mode.useRbacForRequest()" returns true and user isn't authorized responds with a 404`, async () => {
    const headers = {
      authorization: 'foo',
    };
    const server = new Server();
    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: false });
    const mockAuthorizationService: AuthorizationService = {
      actions,
      checkPrivilegesDynamicallyWithRequest: (req: any) => {
        // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
        // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
        expect(req.headers).toMatchObject(headers);

        return mockCheckPrivileges;
      },
      mode: {
        useRbacForRequest: jest.fn().mockReturnValue(true),
      },
    } as any;
    initAppAuthorization(server, createMockXPackMainPlugin(), mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/app/foo',
        handler: () => {
          return 'foo app response';
        },
      },
    ]);
    const { request, result, statusCode } = await server.inject({
      method: 'GET',
      url: '/app/foo',
      headers,
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "error": "Not Found",
  "message": "Not Found",
  "statusCode": 404,
}
`);
    expect(statusCode).toBe(404);
    expect(mockCheckPrivileges).toHaveBeenCalledWith(actions.app.get('foo'));
    expect(mockAuthorizationService.mode.useRbacForRequest).toHaveBeenCalledWith(request);
  });
});
