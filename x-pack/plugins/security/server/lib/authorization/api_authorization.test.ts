/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { AuthorizationService } from './service';

import { actionsFactory } from './actions';
import { initAPIAuthorization } from './api_authorization';

const actions = actionsFactory({
  get: (key: string) => {
    if (key === 'pkg.version') {
      return `1.0.0-zeta1`;
    }

    throw new Error(`Unexpected config key: ${key}`);
  },
});

describe('initAPIAuthorization', () => {
  test(`route that doesn't start with "/api/" continues`, async () => {
    const server = new Server();
    initAPIAuthorization(server, {} as AuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/app/foo',
        handler: () => {
          return 'foo app response';
        },
      },
    ]);
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/app/foo',
    });
    expect(result).toBe('foo app response');
    expect(statusCode).toBe(200);
  });

  test(`protected route that starts with "/api/", but "mode.useRbac()" returns false continues`, async () => {
    const server = new Server();
    const mockAuthorizationService: AuthorizationService = {
      mode: {
        useRbac: jest.fn().mockReturnValue(false),
      },
    } as any;
    initAPIAuthorization(server, mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/api/foo',
        options: {
          tags: ['access:foo'],
        },
        handler: () => {
          return 'foo api response';
        },
      },
    ]);
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/api/foo',
    });
    expect(result).toBe('foo api response');
    expect(statusCode).toBe(200);
  });

  test(`unprotected route that starts with "/api/", but "mode.useRbac()" returns true continues`, async () => {
    const server = new Server();
    const mockAuthorizationService: AuthorizationService = {
      mode: {
        useRbac: jest.fn().mockReturnValue(true),
      },
    } as any;
    initAPIAuthorization(server, mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/api/foo',
        options: {
          tags: ['not-access:foo'],
        },
        handler: () => {
          return 'foo api response';
        },
      },
    ]);
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/api/foo',
    });
    expect(result).toBe('foo api response');
    expect(statusCode).toBe(200);
  });

  test(`protected route that starts with "/api/", "mode.useRbac()" returns true and user is authorized continues`, async () => {
    const headers = {
      authorization: 'foo',
    };
    const server = new Server();
    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: true });
    const mockAuthorizationService: AuthorizationService = {
      actions,
      checkPrivilegesDynamicallyWithRequest: (request: any) => {
        // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
        // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
        expect(request.headers).toMatchObject(headers);

        return mockCheckPrivileges;
      },
      mode: {
        useRbac: jest.fn().mockReturnValue(true),
      },
    } as any;
    initAPIAuthorization(server, mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/api/foo',
        options: {
          tags: ['access:foo'],
        },
        handler: () => {
          return 'foo api response';
        },
      },
    ]);
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/api/foo',
      headers,
    });
    expect(result).toBe('foo api response');
    expect(statusCode).toBe(200);
    expect(mockCheckPrivileges).toHaveBeenCalledWith([actions.api.get('foo')]);
  });

  test(`protected route that starts with "/api/", "mode.useRbac()" returns true and user isn't authorized responds with a 404`, async () => {
    const headers = {
      authorization: 'foo',
    };
    const server = new Server();
    const mockCheckPrivileges = jest.fn().mockReturnValue({ hasAllRequested: false });
    const mockAuthorizationService: AuthorizationService = {
      actions,
      checkPrivilegesDynamicallyWithRequest: (request: any) => {
        // hapi conceals the actual "request" from us, so we make sure that the headers are passed to
        // "checkPrivilegesDynamicallyWithRequest" because this is what we're really concerned with
        expect(request.headers).toMatchObject(headers);

        return mockCheckPrivileges;
      },
      mode: {
        useRbac: jest.fn().mockReturnValue(true),
      },
    } as any;
    initAPIAuthorization(server, mockAuthorizationService);
    server.route([
      {
        method: 'GET',
        path: '/api/foo',
        options: {
          tags: ['access:foo'],
        },
        handler: () => {
          return 'foo api response';
        },
      },
    ]);
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/api/foo',
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
    expect(mockCheckPrivileges).toHaveBeenCalledWith([actions.api.get('foo')]);
  });
});
