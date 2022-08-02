/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineAuthenticationRoutes } from '.';
import { routeDefinitionParamsMock } from '../index.mock';

describe('Authentication routes', () => {
  it('does not register any SAML related routes if SAML auth provider is not enabled', () => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    const router = routeParamsMock.router;

    defineAuthenticationRoutes(routeParamsMock);

    const samlRoutePathPredicate = ([{ path }]: [{ path: string }, any]) =>
      path.startsWith('/api/security/saml/');
    expect(router.get.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(router.post.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(router.put.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(router.delete.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
  });
});
