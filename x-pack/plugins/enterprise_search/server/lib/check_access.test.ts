/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./enterprise_search_config_api', () => ({
  callEnterpriseSearchConfigAPI: jest.fn(),
}));
import { callEnterpriseSearchConfigAPI } from './enterprise_search_config_api';

import { checkAccess } from './check_access';
import { spacesMock } from '../../../spaces/server/mocks';

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
  const mockSpaces = spacesMock.createSetup();
  const mockDependencies = {
    request: { auth: { isAuthenticated: true } },
    config: { host: 'http://localhost:3002' },
    security: mockSecurity,
    spaces: mockSpaces,
  } as any;

  describe('when security is disabled', () => {
    it('should allow all access when enabled at the space', async () => {
      const security = undefined;
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
      expect(await checkAccess({ ...mockDependencies, security })).toEqual({
        hasAppSearchAccess: true,
        hasWorkplaceSearchAccess: true,
      });
    });

    it('should disallow access when disabled at the space', async () => {
      const security = undefined;
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(disabledSpace);
      expect(await checkAccess({ ...mockDependencies, security })).toEqual({
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
      });
    });
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
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
      expect(await checkAccess({ ...mockDependencies, security })).toEqual({
        hasAppSearchAccess: true,
        hasWorkplaceSearchAccess: true,
      });
    });

    it('should deny access when disabled at the space ', async () => {
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
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(disabledSpace);
      expect(await checkAccess({ ...mockDependencies, security })).toEqual({
        hasAppSearchAccess: false,
        hasWorkplaceSearchAccess: false,
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
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
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
      mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
      await expect(checkAccess({ ...mockDependencies, security })).rejects.toThrow();
    });
  });

  describe('when the user is a non-superuser', () => {
    describe('when enterpriseSearch.host is not set in kibana.yml', () => {
      it('should deny all access', async () => {
        const config = { host: undefined };
        mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
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
        mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
        expect(await checkAccess(mockDependencies)).toEqual({
          hasAppSearchAccess: false,
          hasWorkplaceSearchAccess: true,
        });
      });

      it('should not make a http call if disabled at the space', async () => {
        (callEnterpriseSearchConfigAPI as jest.Mock).mockClear();
        mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(disabledSpace);
        expect(await checkAccess(mockDependencies)).toEqual({
          hasAppSearchAccess: false,
          hasWorkplaceSearchAccess: false,
        });
        expect(callEnterpriseSearchConfigAPI).not.toHaveBeenCalled();
      });

      it('falls back to no access if no http response', async () => {
        (callEnterpriseSearchConfigAPI as jest.Mock).mockImplementationOnce(() => ({}));
        mockSpaces.spacesService.getActiveSpace.mockResolvedValueOnce(enabledSpace);
        expect(await checkAccess(mockDependencies)).toEqual({
          hasAppSearchAccess: false,
          hasWorkplaceSearchAccess: false,
        });
      });
    });
  });
});
