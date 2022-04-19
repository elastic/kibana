/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { routeDefinitionParamsMock } from '../index.mock';
import { defineRoleMappingFeatureCheckRoute } from './feature_check';

interface TestOptions {
  licenseCheckResult?: LicenseCheck;
  canManageRoleMappings?: boolean;
  nodeSettingsResponse?: () => Record<string, any>;
  xpackUsageResponse?: () => Record<string, any>;
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
      licenseCheckResult = { state: 'valid' },
      canManageRoleMappings = true,
      nodeSettingsResponse = () => ({}),
      xpackUsageResponse = () => defaultXpackUsageResponse,
      asserts,
    }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const mockContext = {
        core: coreMock.createRequestHandlerContext(),
        licensing: { license: { check: jest.fn().mockReturnValue(licenseCheckResult) } } as any,
      };

      mockContext.core.elasticsearch.client.asInternalUser.nodes.info.mockImplementation(
        (async () => nodeSettingsResponse()) as any
      );
      mockContext.core.elasticsearch.client.asInternalUser.transport.request.mockImplementation(
        (async () => xpackUsageResponse()) as any
      );
      mockContext.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: canManageRoleMappings,
      } as any);

      defineRoleMappingFeatureCheckRoute(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/internal/security/_check_role_mapping_features`,
        headers,
      });

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
    nodeSettingsResponse: () => ({
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['stored', 'inline'],
            },
          },
        },
      },
    }),
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

  getFeatureCheckTest('disallows stored scripts when disabled', {
    nodeSettingsResponse: () => ({
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['inline'],
            },
          },
        },
      },
    }),
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

  getFeatureCheckTest('disallows inline scripts when disabled', {
    nodeSettingsResponse: () => ({
      nodes: {
        someNodeId: {
          settings: {
            script: {
              allowed_types: ['stored'],
            },
          },
        },
      },
    }),
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
    xpackUsageResponse: () => ({
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
    }),
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

  getFeatureCheckTest(
    'falls back to allowing both script types if there is an error retrieving node settings',
    {
      nodeSettingsResponse: () => {
        throw new Error('something bad happened');
      },
      xpackUsageResponse: () => {
        throw new Error('something bad happened');
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
    }
  );
});
