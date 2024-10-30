/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { KibanaResponseFactory, SavedObjectsClientContract } from '@kbn/core/server';

import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';

import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';

import { registerActionStateRoutes } from './state';
import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import { ACTION_STATE_ROUTE } from '../../../../common/endpoint/constants';

interface CallRouteInterface {
  authz?: Partial<EndpointAuthz>;
}

describe('when calling the Action state route handler', () => {
  let mockScopedEsClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let callRoute: (
    routerMock: RouterMock,
    routePrefix: string,
    opts: CallRouteInterface,
    indexExists?: { endpointDsExists: boolean }
  ) => Promise<void>;

  beforeEach(() => {
    const startContract = createMockEndpointAppContextServiceStartContract();
    mockResponse = httpServerMock.createResponseFactory();
    // define a convenience function to execute an API call for a given route
    callRoute = async (
      routerMock: RouterMock,
      routePrefix: string,
      { authz = {} }: CallRouteInterface
    ): Promise<void> => {
      const superUser = {
        username: 'superuser',
        roles: ['superuser'],
      };
      (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
        () => superUser
      );

      const ctx = createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient);

      ctx.securitySolution.getEndpointAuthz.mockResolvedValue(
        getEndpointAuthzInitialStateMock(authz)
      );

      const mockRequest = httpServerMock.createKibanaRequest();

      const { routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        routePrefix,
        '2023-10-31'
      );

      await routeHandler(ctx, mockRequest, mockResponse);
    };
  });
  describe('with having right privileges', () => {
    it.each([[true], [false]])(
      'when can encrypt is set to %s it returns proper value',
      async (canEncrypt) => {
        const routerMock: RouterMock = httpServiceMock.createRouter();
        registerActionStateRoutes(routerMock, createMockEndpointAppContext(), canEncrypt);

        await callRoute(routerMock, ACTION_STATE_ROUTE, {
          authz: { canIsolateHost: true },
        });

        expect(mockResponse.ok).toHaveBeenCalledWith({ body: { data: { canEncrypt } } });
      }
    );
  });
  describe('without having right privileges', () => {
    it('it returns unauthorized error', async () => {
      const routerMock: RouterMock = httpServiceMock.createRouter();
      registerActionStateRoutes(routerMock, createMockEndpointAppContext(), true);

      await callRoute(routerMock, ACTION_STATE_ROUTE, {
        authz: {
          canIsolateHost: false,
          canUnIsolateHost: false,
          canKillProcess: false,
          canSuspendProcess: false,
          canGetRunningProcesses: false,
          canAccessResponseConsole: false,
          canWriteExecuteOperations: false,
          canWriteFileOperations: false,
          canWriteScanOperations: false,
        },
      });

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
