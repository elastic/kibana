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
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import type { InternalAuthenticationServiceStart } from '../../authentication';
import { authenticationServiceMock } from '../../authentication/authentication_service.mock';
import type { Session } from '../../session_management';
import { sessionMock } from '../../session_management/session.mock';
import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import type { UserProfileServiceStartInternal } from '../../user_profile';
import { userProfileServiceMock } from '../../user_profile/user_profile_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineUpdateUserProfileDataRoute } from './update';

function getMockContext() {
  return {
    licensing: {
      license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
    },
  } as unknown as SecurityRequestHandlerContext;
}

describe('Update profile routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let session: jest.Mocked<PublicMethodsOf<Session>>;
  let userProfileService: jest.Mocked<UserProfileServiceStartInternal>;
  let authc: DeeplyMockedKeys<InternalAuthenticationServiceStart>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    session = sessionMock.create();
    routeParamsMock.getSession.mockReturnValue(session);

    userProfileService = userProfileServiceMock.createStart();
    routeParamsMock.getUserProfileService.mockReturnValue(userProfileService);

    authc = authenticationServiceMock.createStart();
    routeParamsMock.getAuthenticationService.mockReturnValue(authc);

    defineUpdateUserProfileDataRoute(routeParamsMock);
  });

  describe('update profile data', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [updateRouteConfig, updateRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/user_profile/_data'
      )!;

      routeConfig = updateRouteConfig;
      routeHandler = updateRouteHandler;
    });

    it('correctly defines route.', () => {
      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate(0)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [object] but got [number]"`
      );
      expect(() => bodySchema.validate('avatar')).toThrowErrorMatchingInlineSnapshot(
        `"could not parse record value from json input"`
      );
      expect(() => bodySchema.validate(true)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [object] but got [boolean]"`
      );
      expect(() => bodySchema.validate(null)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [object] but got [null]"`
      );
      expect(() => bodySchema.validate(undefined)).toThrowErrorMatchingInlineSnapshot(
        `"expected value of type [object] but got [undefined]"`
      );

      expect(bodySchema.validate({})).toEqual({});
      expect(
        bodySchema.validate({ title: 'some-title', content: { deepProperty: { type: 'basic' } } })
      ).toEqual({ title: 'some-title', content: { deepProperty: { type: 'basic' } } });
    });

    it('fails if session is not found.', async () => {
      await expect(
        routeHandler(
          getMockContext(),
          httpServerMock.createKibanaRequest({ body: {} }),
          kibanaResponseFactory
        )
      ).resolves.toEqual(expect.objectContaining({ status: 404 }));

      expect(userProfileService.update).not.toHaveBeenCalled();
    });

    it('fails if session does not have profile ID.', async () => {
      session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: undefined }),
      });

      await expect(
        routeHandler(
          getMockContext(),
          httpServerMock.createKibanaRequest({ body: {} }),
          kibanaResponseFactory
        )
      ).resolves.toEqual(expect.objectContaining({ status: 404 }));

      expect(userProfileService.update).not.toHaveBeenCalled();
    });

    it('fails for Elastic Cloud users.', async () => {
      session.get.mockResolvedValue({ error: null, value: sessionMock.createValue() });
      authc.getCurrentUser.mockReturnValue(mockAuthenticatedUser({ elastic_cloud_user: true }));

      await expect(
        routeHandler(
          getMockContext(),
          httpServerMock.createKibanaRequest({ body: {} }),
          kibanaResponseFactory
        )
      ).resolves.toEqual(expect.objectContaining({ status: 403 }));

      expect(userProfileService.update).not.toHaveBeenCalled();
    });

    it('updates profile.', async () => {
      session.get.mockResolvedValue({
        error: null,
        value: sessionMock.createValue({ userProfileId: 'u_some_id' }),
      });
      authc.getCurrentUser.mockReturnValue(mockAuthenticatedUser());

      await expect(
        routeHandler(
          getMockContext(),
          httpServerMock.createKibanaRequest({ body: { some: 'property' } }),
          kibanaResponseFactory
        )
      ).resolves.toEqual(expect.objectContaining({ status: 200, payload: undefined }));

      expect(userProfileService.update).toBeCalledTimes(1);
      expect(userProfileService.update).toBeCalledWith('u_some_id', { some: 'property' });
    });
  });
});
