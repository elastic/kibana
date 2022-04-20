/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spacesMock } from '@kbn/spaces-plugin/server/mocks';

import { checkAccess } from './check_access';

jest.mock('./enterprise_search_config_api', () => ({
  callEnterpriseSearchConfigAPI: jest.fn(),
}));
import { callEnterpriseSearchConfigAPI } from './enterprise_search_config_api';

const enabledSpace = {
  id: 'space',
  name: 'space',
  disabledFeatures: [],
};

const disabledSpace = {
  id: 'space',
  name: 'space',
  disabledFeatures: ['enterpriseSearch'],
};

describe('checkAccess', () => {
  const mockSecurity = {
    authz: {
      mode: {
        useRbacForRequest: () => true,
      },
      checkPrivilegesWithRequest: () => ({
        globally: () => ({
          hasAllRequested: false,
        }),
      }),
      actions: {
        ui: {
          get: () => null,
        },
      },
    },
  };
  const mockSpaces = spacesMock.createStart();
  const mockDependencies = {
    request: { auth: { isAuthenticated: true } },
    config: { host: 'http://localhost:3002' },
    security: mockSecurity,
    spaces: mockSpaces,
  } as any;

  describe('when security is disabled', () => {
    it('should deny all access', async () => {
      const security = {
        authz: { mode: { useRbacForRequest: () => false } },
      };
      expect(await checkAccess({ ...mockDependencies, security })).toEqual({
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
      });
    });
  });

  describe('when the current request is unauthenticated', () => {
    it('should deny all access', async () => {
      const request = {
        auth: { isAuthenticated: false },
      };
      expect(await checkAccess({ ...mockDependencies, request })).toEqual({
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
      });
    });
  });

  describe('when the space is disabled', () => {
    it('should deny all access', async () => {
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(disabledSpace);
      expect(await checkAccess({ ...mockDependencies })).toEqual({
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
      });
    });
  });

  describe('when the Spaces plugin is unavailable', () => {
    describe('when getActiveSpace returns 403 forbidden', () => {
      it('should deny all access', async () => {
        mockSpaces.spacesService.getActiveSpace.mockReturnValueOnce(
          Promise.reject({ output: { statusCode: 403 } })
        );
        expect(await checkAccess({ ...mockDependencies })).toEqual({
          hasAppSearchAccess: false,
          hasWorkplaceSearchAccess: false,
        });
      });
    });

    describe('when getActiveSpace throws', () => {
      it('should re-throw', async () => {
        mockSpaces.spacesService.getActiveSpace.mockReturnValueOnce(Promise.reject('Error'));
        let expectedError = '';
        try {
          await checkAccess({ ...mockDependencies });
        } catch (e) {
          expectedError = e;
        }
        expect(expectedError).toEqual('Error');
      });
    });
  });

  describe('when the space is enabled', () => {
    beforeEach(() => {
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
    });

    describe('when the user is a superuser', () => {
      it('should allow all access when enabled at the space ', async () => {
        const security = {
          ...mockSecurity,
          authz: {
            mode: { useRbacForRequest: () => true },
            checkPrivilegesWithRequest: () => ({
              globally: () => ({
                hasAllRequested: true,
              }),
            }),
            actions: { ui: { get: () => {} } },
          },
        };
        expect(await checkAccess({ ...mockDependencies, security })).toEqual({
          hasAppSearchAccess: true,
          hasWorkplaceSearchAccess: true,
        });
      });

      it('falls back to assuming a non-superuser role if auth credentials are missing', async () => {
        const security = {
          authz: {
            ...mockSecurity.authz,
            checkPrivilegesWithRequest: () => ({
              globally: () => Promise.reject({ statusCode: 403 }),
            }),
          },
        };
        expect(await checkAccess({ ...mockDependencies, security })).toEqual({
          hasAppSearchAccess: false,
          hasWorkplaceSearchAccess: false,
        });
      });

      it('throws other authz errors', async () => {
        const security = {
          authz: {
            ...mockSecurity.authz,
            checkPrivilegesWithRequest: undefined,
          },
        };
        await expect(checkAccess({ ...mockDependencies, security })).rejects.toThrow();
      });
    });

    describe('when the user is a non-superuser', () => {
      describe('when enterpriseSearch.host is not set in kibana.yml', () => {
        it('should deny all access', async () => {
          const config = { host: undefined };
          expect(await checkAccess({ ...mockDependencies, config })).toEqual({
            hasAppSearchAccess: false,
            hasWorkplaceSearchAccess: false,
          });
        });
      });

      describe('when enterpriseSearch.host is set in kibana.yml', () => {
        it('should make a http call and return the access response', async () => {
          (callEnterpriseSearchConfigAPI as jest.Mock).mockImplementationOnce(() => ({
            access: {
              hasAppSearchAccess: false,
              hasWorkplaceSearchAccess: true,
            },
          }));
          expect(await checkAccess(mockDependencies)).toEqual({
            hasAppSearchAccess: false,
            hasWorkplaceSearchAccess: true,
          });
        });

        it('falls back to no access if no http response', async () => {
          (callEnterpriseSearchConfigAPI as jest.Mock).mockImplementationOnce(() => ({}));
          expect(await checkAccess(mockDependencies)).toEqual({
            hasAppSearchAccess: false,
            hasWorkplaceSearchAccess: false,
          });
        });
      });
    });
  });
});
