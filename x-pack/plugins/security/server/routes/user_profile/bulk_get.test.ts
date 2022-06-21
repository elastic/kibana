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

import type { SecurityRequestHandlerContext, SecurityRouter } from '../../types';
import type { UserProfileServiceStartInternal } from '../../user_profile';
import { userProfileServiceMock } from '../../user_profile/user_profile_service.mock';
import { routeDefinitionParamsMock } from '../index.mock';
import { defineBulkGetUserProfilesRoute } from './bulk_get';

function getMockContext() {
  return {
    licensing: {
      license: { check: jest.fn().mockReturnValue({ check: 'valid' }) },
    },
  } as unknown as SecurityRequestHandlerContext;
}

describe('Bulk get profile routes', () => {
  let router: jest.Mocked<SecurityRouter>;
  let userProfileService: jest.Mocked<UserProfileServiceStartInternal>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    router = routeParamsMock.router;

    userProfileService = userProfileServiceMock.createStart();
    routeParamsMock.getUserProfileService.mockReturnValue(userProfileService);

    defineBulkGetUserProfilesRoute(routeParamsMock);
  });

  describe('get user profiles by their ids', () => {
    let routeHandler: RequestHandler<any, any, any, SecurityRequestHandlerContext>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [updateRouteConfig, updateRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/internal/security/user_profile/_bulk_get'
      )!;

      routeConfig = updateRouteConfig;
      routeHandler = updateRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ tags: ['access:bulkGetUserProfiles'] });

      const bodySchema = (routeConfig.validate as any).body as ObjectType;
      expect(() => bodySchema.validate(0)).toThrowErrorMatchingInlineSnapshot(
        `"expected a plain object value, but found [number] instead."`
      );
      expect(() => bodySchema.validate(null)).toThrowErrorMatchingInlineSnapshot(
        `"expected a plain object value, but found [null] instead."`
      );
      expect(() => bodySchema.validate(undefined)).toThrowErrorMatchingInlineSnapshot(
        `"[uids]: expected value of type [array] but got [undefined]"`
      );

      expect(() => bodySchema.validate({})).toThrowErrorMatchingInlineSnapshot(
        `"[uids]: expected value of type [array] but got [undefined]"`
      );
      expect(() => bodySchema.validate({ uids: [] })).toThrowErrorMatchingInlineSnapshot(
        `"[uids]: array size is [0], but cannot be smaller than [1]"`
      );
      expect(bodySchema.validate({ uids: ['uid-1', 'uid-2'] })).toEqual({
        uids: ['uid-1', 'uid-2'],
      });
      expect(bodySchema.validate({ uids: ['uid-1', 'uid-2'], data: '*' })).toEqual({
        uids: ['uid-1', 'uid-2'],
        data: '*',
      });
    });

    it('fails if bulk get call fails.', async () => {
      const unhandledException = new Error('Something went wrong.');
      userProfileService.bulkGet.mockRejectedValue(unhandledException);

      await expect(
        routeHandler(
          getMockContext(),
          httpServerMock.createKibanaRequest({ body: { uids: ['uid-1', 'uid-2'], data: '*' } }),
          kibanaResponseFactory
        )
      ).resolves.toEqual(expect.objectContaining({ status: 500, payload: unhandledException }));

      expect(userProfileService.update).not.toHaveBeenCalled();
    });
  });
});
