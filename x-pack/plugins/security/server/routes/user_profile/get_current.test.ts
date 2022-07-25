/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { RequestHandler, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { userProfileMock } from '../../../common/model/user_profile.mock';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import type { UserProfileServiceStartInternal } from '../../user_profile';
import { userProfileServiceMock } from '../../user_profile/user_profile_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineGetCurrentUserProfileRoute } from './get_current';

function getMockContext() {
  return {
    licensing: {
      license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
    },
  } as unknown as SecurityRequestHandlerContext;
}

describe('Get current user profile routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let userProfileService: jest.Mocked<UserProfileServiceStartInternal>;
  let authenticationService: ReturnType<typeof authenticationServiceMock.createStart>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    userProfileService = userProfileServiceMock.createStart();
    routeParamsMock.getUserProfileService.mockReturnValue(userProfileService);

    authenticationService = authenticationServiceMock.createStart();
    routeParamsMock.getAuthenticationService.mockReturnValue(authenticationService);

    defineGetCurrentUserProfileRoute(routeParamsMock);
  });

  describe('get profile for the currently authenticated user', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [updateRouteConfig, updateRouteHandler] = router.get.mock.calls.find(
        ([{ path }]) => path === '/internal/security/user_profile'
      )!;

      routeConfig = updateRouteConfig;
      routeHandler = updateRouteHandler;
    });

    it('correctly defines route.', () => {
      const querySchema = (routeConfig.validate as any).query as ObjectType;
      expect(() => querySchema.validate(0)).toThrowErrorMatchingInlineSnapshot(
        `"expected a plain object value, but found [number] instead."`
      );
      expect(() => querySchema.validate(null)).toThrowErrorMatchingInlineSnapshot(
        `"expected a plain object value, but found [null] instead."`
      );

      expect(querySchema.validate(undefined)).toEqual({});
      expect(querySchema.validate({})).toEqual({});
      expect(querySchema.validate({ dataPath: '*' })).toEqual({ dataPath: '*' });
    });

    it('returns `404` if user is not available', async () => {
      authenticationService.getCurrentUser.mockReturnValue(null);

      await expect(
        routeHandler(getMockContext(), httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 404 }));

      expect(userProfileService.getCurrent).not.toHaveBeenCalled();
    });

    it('returns `404` if profile is not available', async () => {
      const mockRequest = httpServerMock.createKibanaRequest();
      authenticationService.getCurrentUser.mockReturnValue(mockAuthenticatedUser());
      userProfileService.getCurrent.mockResolvedValue(null);

      await expect(
        routeHandler(getMockContext(), mockRequest, kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 404 }));

      expect(userProfileService.getCurrent).toBeCalledTimes(1);
      expect(userProfileService.getCurrent).toBeCalledWith({ request: mockRequest });
    });

    it('fails if `getCurrent` call fails.', async () => {
      const unhandledException = new Error('Something went wrong.');
      const mockRequest = httpServerMock.createKibanaRequest();
      authenticationService.getCurrentUser.mockReturnValue(mockAuthenticatedUser());
      userProfileService.getCurrent.mockRejectedValue(unhandledException);

      await expect(
        routeHandler(getMockContext(), mockRequest, kibanaResponseFactory)
      ).resolves.toEqual(expect.objectContaining({ status: 500, payload: unhandledException }));

      expect(userProfileService.getCurrent).toBeCalledTimes(1);
      expect(userProfileService.getCurrent).toBeCalledWith({ request: mockRequest });
    });

    it('returns user profile for the current user.', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ query: { dataPath: '*' } });

      const mockUser = mockAuthenticatedUser();
      authenticationService.getCurrentUser.mockReturnValue(mockUser);

      const mockProfile = userProfileMock.createWithSecurity({ uid: 'uid-1' });
      userProfileService.getCurrent.mockResolvedValue(mockProfile);

      await expect(
        routeHandler(getMockContext(), mockRequest, kibanaResponseFactory)
      ).resolves.toEqual(
        expect.objectContaining({
          status: 200,
          payload: {
            ...mockProfile,
            user: {
              ...mockProfile.user,
              authentication_provider: mockUser.authentication_provider,
            },
          },
        })
      );

      expect(userProfileService.getCurrent).toBeCalledTimes(1);
      expect(userProfileService.getCurrent).toBeCalledWith({ request: mockRequest, dataPath: '*' });
    });
  });
});
