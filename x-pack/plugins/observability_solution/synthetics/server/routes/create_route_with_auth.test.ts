/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSyntheticsRouteWithAuth } from './create_route_with_auth';
import { SupportedMethod } from './types';

const methods: SupportedMethod[][] = [['GET'], ['POST'], ['PUT'], ['DELETE']];

describe('createSyntheticsRouteWithAuth', () => {
  it.each(
    methods
      .map<[SupportedMethod, boolean]>((m) => [m[0], true])
      .concat(methods.map((m) => [m[0], false]))
  )('%s methods continues to support the writeAccess %s flag', (mStr, writeAccess) => {
    const method: SupportedMethod = mStr as SupportedMethod;
    const route = createSyntheticsRouteWithAuth(() => ({
      method,
      path: '/foo',
      validate: {},
      writeAccess,
      handler: async () => {
        return { success: true };
      },
    }));

    expect(route).toEqual({
      method,
      path: '/foo',
      validate: {},
      handler: expect.any(Function),
      writeAccess,
    });
  });

  it('by default allows read access for GET by default', () => {
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

  it.each(methods.filter((m) => m[0] !== 'GET'))(
    'by default requires write access for %s route requests',
    (method) => {
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
});
