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
  const mockDependencies = {
    request: {},
    config: { host: 'http://localhost:3002' },
    security: mockSecurity,
  } as any;

  describe('when security is disabled', () => {
    it('should allow all access', async () => {
      const security = undefined;
      expect(await checkAccess({ ...mockDependencies, security })).toEqual({
        hasAppSearchAccess: true,
        hasWorkplaceSearchAccess: true,
      });
    });
  });

  describe('when the user is a superuser', () => {
    it('should allow all access', async () => {
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
