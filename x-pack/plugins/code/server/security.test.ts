/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
// @ts-ignore
import HapiAuthCookie from 'hapi-auth-cookie';
import { SecureRoute } from './security';

const createMockServer = async () => {
  const server = new Server();
  server.register(HapiAuthCookie);
  server.auth.strategy('session', 'cookie', {
    password: 'secret',
    validateFunc: async (request: any, username: any, password: any) => {
      const isValid = username === 'foo' && password === 'bar';
      const credentials = {
        roles: ['superuser'],
      };
      return { isValid, credentials };
    },
  });

  const secureRoute = new SecureRoute(server);
  secureRoute.install();
  server.securedRoute({
    method: 'GET',
    path: '/test',
    options: {
      auth: 'session',
    },
    requireAdmin: true,
    handler() {
      return 'ok';
    },
  });
  return server;
};

it('should response 401 when not logged in', async () => {
  const server = await createMockServer();

  const response = await server.inject({
    method: 'GET',
    url: '/test',
  });
  expect(response.statusCode).toBe(401);
});

async function checkWithRoles(server: any, roles: any) {
  const response = await server.inject({
    method: 'GET',
    url: '/test',
    credentials: {
      username: 'foo',
      password: 'bar',
      roles,
    },
  });
  return response;
}

it.skip('should response 403 when roles check failed', async () => {
  const server = await createMockServer();
  const response = await checkWithRoles(server, []);
  expect(response.statusCode).toBe(403);
});

it('should response 200 when user is superuser', async () => {
  const server = await createMockServer();
  const response = await checkWithRoles(server, ['superuser']);
  expect(response.statusCode).toBe(200);
});

it('should response 200 when user is code admin', async () => {
  const server = await createMockServer();
  const response = await checkWithRoles(server, ['code_admin']);
  expect(response.statusCode).toBe(200);
});
