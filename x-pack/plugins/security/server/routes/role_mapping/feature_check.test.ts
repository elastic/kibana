/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routeDefinitionParamsMock } from '../index.mock';
import { elasticsearchServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandlerContext } from '../../../../../../src/core/server';
import { LICENSE_CHECK_STATE, LicenseCheck } from '../../../../licensing/server';
import { defineRoleMappingFeatureCheckRoute } from './feature_check';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  canManageRoleMappings?: boolean;
  nodeSettingsResponse?: Record<string, any>;
  xpackUsageResponse?: Record<string, any>;
  asserts: { statusCode: number; result?: Record<string, any> };
}

const defaultXpackUsageResponse = {
  security: {
    realms: {
      native: {
        available: true,
        enabled: true,
      },
      pki: {
        available: true,
        enabled: true,
      },
    },
  },
};

describe('GET role mappings feature check', () => {
  const getFeatureCheckTest = (
    description: string,
    {
      licenseCheckResult = { state: LICENSE_CHECK_STATE.Valid },
      canManageRoleMappings = true,
      nodeSettingsResponse = {},
      xpackUsageResponse = defaultXpackUsageResponse,
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockRouteDefinitionParams.clusterClient.asScoped.mockReturnValue(mockScopedClusterClient);
      mockRouteDefinitionParams.clusterClient.callAsInternalUser.mockImplementation(
        async (method, payload) => {
          if (!payload) throw new TypeError('expected payload');

          if (method === 'transport.request') {
            if (payload.path && payload.path.startsWith('/_nodes/settings')) {
              return nodeSettingsResponse;
            }

            if (payload.path === '/_xpack/usage') {
              return xpackUsageResponse;
            }
          }

          throw new Error(`unexpected method: ${method}`);
        }
      );

      mockScopedClusterClient.callAsCurrentUser.mockImplementation(async (method, payload) => {
        if (method === 'shield.hasPrivileges') {
          return {
            has_all_requested: canManageRoleMappings,
          };
        }
      });

      defineRoleMappingFeatureCheckRoute(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/internal/security/role_mapping_feature_check`,
        headers,
      });
      const mockContext = ({
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } },
      } as unknown) as RequestHandlerContext;

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      expect(mockContext.licensing.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  getFeatureCheckTest('allows both script types with the default settings', {
    asserts: {
      statusCode: 200,
      result: {
        canManageRoleMappings: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
        hasCompatibleRealms: true,
      },
    },
  });

  getFeatureCheckTest('allows both script types when explicitly enabled', {
    nodeSettingsResponse: {
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['stored', 'inline'],
            },
          },
        },
      },
    },
    asserts: {
      statusCode: 200,
      result: {
        canManageRoleMappings: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
        hasCompatibleRealms: true,
      },
    },
  });

  getFeatureCheckTest('disallowes stored scripts when disabled', {
    nodeSettingsResponse: {
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['inline'],
            },
          },
        },
      },
    },
    asserts: {
      statusCode: 200,
      result: {
        canManageRoleMappings: true,
        canUseInlineScripts: true,
        canUseStoredScripts: false,
        hasCompatibleRealms: true,
      },
    },
  });

  getFeatureCheckTest('disallowes inline scripts when disabled', {
    nodeSettingsResponse: {
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['stored'],
            },
          },
        },
      },
    },
    asserts: {
      statusCode: 200,
      result: {
        canManageRoleMappings: true,
        canUseInlineScripts: false,
        canUseStoredScripts: true,
        hasCompatibleRealms: true,
      },
    },
  });

  getFeatureCheckTest('indicates incompatible realms when only native and file are enabled', {
    xpackUsageResponse: {
      security: {
        realms: {
          native: {
            available: true,
            enabled: true,
          },
          file: {
            available: true,
            enabled: true,
          },
        },
      },
    },
    asserts: {
      statusCode: 200,
      result: {
        canManageRoleMappings: true,
        canUseInlineScripts: true,
        canUseStoredScripts: true,
        hasCompatibleRealms: false,
      },
    },
  });

  getFeatureCheckTest('indicates canManageRoleMappings=false for users without `manage_security`', {
    canManageRoleMappings: false,
    asserts: {
      statusCode: 200,
      result: {
        canManageRoleMappings: false,
      },
    },
  });
});
