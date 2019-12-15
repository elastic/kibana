/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineAuthenticationRoutes } from '.';
import { ConfigType } from '../../config';

import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { authenticationMock } from '../../authentication/index.mock';
import { authorizationMock } from '../../authorization/index.mock';

describe('Authentication routes', () => {
  it('does not register any SAML related routes if SAML auth provider is not enabled', () => {
    const router = httpServiceMock.createRouter();

    defineAuthenticationRoutes({
      router,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      basePath: httpServiceMock.createBasePath(),
      logger: loggingServiceMock.create().get(),
      config: { authc: { providers: ['basic'] } } as ConfigType,
      authc: authenticationMock.create(),
      authz: authorizationMock.create(),
      csp: httpServiceMock.createSetupContract().csp,
    });

    const samlRoutePathPredicate = ([{ path }]: [{ path: string }, any]) =>
      path.startsWith('/api/security/saml/');
    expect(router.get.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(router.post.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(router.put.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
    expect(router.delete.mock.calls.find(samlRoutePathPredicate)).toBeUndefined();
  });
});
