/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSyntheticsRouteWithAuth } from './create_route_with_auth';

describe('createSyntheticsRouteWithAuth', () => {
  it('should create a route with auth', () => {
    const route = createSyntheticsRouteWithAuth(() => ({
      method: 'GET',
      path: '/foo',
      validate: {},
      handler: async () => {
        return { success: true };
      },
    }));

    expect(route).toEqual({
      method: 'GET',
      path: '/foo',
      validate: {},
      handler: expect.any(Function),
      writeAccess: false,
    });
  });

  it.each([['POST'], ['PUT'], ['DELETE']])(
    'requires write permissions for %s requests',
    (method) => {
      if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE')
        throw Error('Invalid method');
      const route = createSyntheticsRouteWithAuth(() => ({
        method,
        path: '/foo',
        validate: {},
        handler: async () => {
          return { success: true };
        },
      }));

      expect(route).toEqual({
        method,
        path: '/foo',
        validate: {},
        handler: expect.any(Function),
        writeAccess: true,
      });
    }
  );

  it.each([['POST'], ['PUT'], ['DELETE']])(
    'allows write access override for %s requests',
    (method) => {
      if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE')
        throw Error('Invalid method');
      const route = createSyntheticsRouteWithAuth(() => ({
        method,
        path: '/foo',
        validate: {},
        handler: async () => {
          return { success: true };
        },
        writeAccessOverride: true,
      }));

      expect(route).toEqual({
        method,
        path: '/foo',
        validate: {},
        handler: expect.any(Function),
        writeAccess: undefined,
      });
    }
  );
});
